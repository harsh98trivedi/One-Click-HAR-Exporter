// State
let sessionData = {};
const attachedTabs = new Set(); // tabIds currently attached
const pendingTimers = new Map(); // tabId -> timeout id
const pendingFilenames = []; // queue for onDeterminingFilename

// Force filename even for data: URLs (MV3-friendly)
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.byExtensionId === chrome.runtime.id && pendingFilenames.length) {
    const name = pendingFilenames.shift();
    suggest({ filename: name, conflictAction: "uniquify" });
  } else {
    suggest();
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "start_recording") {
    const tabId = request.tabId;
    sessionData[tabId] = { networkLogs: {}, consoleLogs: [] };
    attachDebugger(tabId); // async fire-and-forget
  }
});

function postStatus(text) {
  try {
    chrome.runtime.sendMessage(
      { action: "update_status", text },
      () => void chrome.runtime.lastError
    );
  } catch (_) {}
}

/** Attach + enable domains sequentially to avoid races */
async function attachDebugger(tabId) {
  // Attach
  const attached = await new Promise((resolve) => {
    try {
      chrome.debugger.attach({ tabId }, "1.3", () => {
        if (chrome.runtime.lastError) return resolve(false);
        resolve(true);
      });
    } catch (_) {
      resolve(false);
    }
  });
  if (!attached) {
    postStatus(
      "Error: " + (chrome.runtime.lastError?.message || "Attach failed")
    );
    return;
  }
  attachedTabs.add(tabId);

  // Enable domains in sequence
  await sendCommand({ tabId }, "Network.enable");
  await sendCommand({ tabId }, "Log.enable");
  await sendCommand({ tabId }, "Page.enable");
  await sendCommand({ tabId }, "Network.clearBrowserCache");
  await sendCommand({ tabId }, "Page.reload", { ignoreCache: true });

  if (attachedTabs.has(tabId)) postStatus("Recording...");
}

/** Resolve null on any error or if tab is already detached */
function sendCommand(target, method, params) {
  return new Promise((resolve) => {
    const tabId = target?.tabId;
    if (!tabId || !attachedTabs.has(tabId)) return resolve(null);
    try {
      chrome.debugger.sendCommand(target, method, params, (result) => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(result || null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

// Detach listener — cleanup + cancel scheduled processing
chrome.debugger.onDetach.addListener((source) => {
  const tabId = source.tabId;
  attachedTabs.delete(tabId);
  const t = pendingTimers.get(tabId);
  if (t) {
    clearTimeout(t);
    pendingTimers.delete(tabId);
  }
  delete sessionData[tabId];
});

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  if (!sessionData[tabId] || !attachedTabs.has(tabId)) return;

  if (method === "Log.entryAdded") {
    const msg = params.entry?.text;
    if (msg && msg.trim() !== "") {
      const logEntry = `[${params.entry.level}] ${new Date(
        params.entry.timestamp
      ).toISOString()}: ${msg}`;
      sessionData[tabId].consoleLogs.push(logEntry);
    }
  }

  if (method === "Network.requestWillBeSent") {
    sessionData[tabId].networkLogs[params.requestId] = {
      ...sessionData[tabId].networkLogs[params.requestId],
      requestId: params.requestId,
      startedDateTime: new Date(params.wallTime * 1000).toISOString(),
      request: params.request,
      response: null,
      body: null,
      base64Encoded: false,
      finished: false,
    };
  }

  if (method === "Network.responseReceived") {
    const rec = sessionData[tabId].networkLogs[params.requestId];
    if (rec) rec.response = params.response;
  }

  if (method === "Network.loadingFinished") {
    const rec = sessionData[tabId].networkLogs[params.requestId];
    if (rec) {
      rec.finished = true;
      rec.encodedDataLength = params.encodedDataLength;
    }
  }

  if (method === "Page.loadEventFired") {
    postStatus("Processing...");
    // Avoid multiple timers if multiple events fire
    if (pendingTimers.has(tabId)) return;
    const timerId = setTimeout(() => {
      pendingTimers.delete(tabId);
      processAndExport(tabId);
    }, 2000);
    pendingTimers.set(tabId, timerId);
  }
});

/** ---------- filename helpers: title → safe base name ---------- */
async function buildHarFilename(tabId) {
  try {
    const tab = await new Promise((resolve) =>
      chrome.tabs.get(tabId, (t) => resolve(t))
    );
    const title = tab?.title || "";
    const safeTitle = sanitizeTitleForFilename(title);
    if (safeTitle) return safeTitle;

    try {
      const u = new URL(tab?.url || "");
      if (u.hostname) return sanitizeTitleForFilename(u.hostname);
    } catch (_) {}
  } catch (_) {}
  return "Trace";
}

function sanitizeTitleForFilename(input) {
  let s = String(input || "")
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  s = s.replace(/^[. ]+|[. ]+$/g, "");
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s)) s = s + "-site";
  if (s.length > 120)
    s = s
      .slice(0, 120)
      .trim()
      .replace(/[. ]+$/, "");
  return s;
}
/** -------------------------------------------------------------- */

async function processAndExport(tabId) {
  // Bail if detached meanwhile
  if (!attachedTabs.has(tabId)) return;

  const data = sessionData[tabId];
  if (!data) return;

  // Fetch bodies for finished requests (best effort)
  const validIds = Object.keys(data.networkLogs).filter(
    (id) => data.networkLogs[id].finished && data.networkLogs[id].response
  );
  await Promise.all(
    validIds.map(async (requestId) => {
      const result = await sendCommand({ tabId }, "Network.getResponseBody", {
        requestId,
      });
      if (result) {
        data.networkLogs[requestId].body = result.body;
        data.networkLogs[requestId].base64Encoded = result.base64Encoded;
      }
    })
  );

  const baseName = await buildHarFilename(tabId);
  postStatus("Downloading...");

  // Console log (optional)
  if (data.consoleLogs.length > 0) {
    const logBlob = new Blob([data.consoleLogs.join("\n")], {
      type: "text/plain",
    });
    saveFile(logBlob, baseName + "_Console.txt");
  }

  // HAR file — ALWAYS <title>.har
  const harData = generateHAR(data.networkLogs);
  const harBlob = new Blob([JSON.stringify(harData, null, 2)], {
    type: "application/octet-stream",
  });
  saveFile(harBlob, baseName + ".har");

  // Safe detach + cleanup
  if (attachedTabs.has(tabId)) {
    try {
      chrome.debugger.detach({ tabId }, () => void chrome.runtime.lastError);
    } catch (_) {}
    attachedTabs.delete(tabId);
  }
  delete sessionData[tabId];
  const t = pendingTimers.get(tabId);
  if (t) {
    clearTimeout(t);
    pendingTimers.delete(tabId);
  }
  postStatus("Done!");
}

/** MV3-friendly download via data: URL + filename override */
function saveFile(blob, filename) {
  const reader = new FileReader();
  reader.onloadend = () => {
    pendingFilenames.push(filename);
    chrome.downloads.download(
      {
        url: reader.result,
        filename,
        conflictAction: "uniquify",
        saveAs: false,
      },
      () => void chrome.runtime.lastError
    );
  };
  reader.readAsDataURL(blob);
}

function generateHAR(logs) {
  const entries = Object.keys(logs)
    .map((id) => {
      const item = logs[id];
      if (!item?.request) return null;

      const content = (() => {
        const obj = {
          size: item.encodedDataLength || 0,
          mimeType: item.response?.mimeType || "application/octet-stream",
        };
        if (item.body) {
          obj.text = item.body;
          if (item.base64Encoded) obj.encoding = "base64";
        }
        return obj;
      })();

      return {
        startedDateTime: item.startedDateTime,
        time: 100,
        request: {
          method: item.request.method,
          url: item.request.url,
          httpVersion: "HTTP/1.1",
          headers: formatHeaders(item.request.headers),
          queryString: [],
          headersSize: -1,
          bodySize: -1,
        },
        response: item.response
          ? {
              status: item.response.status,
              statusText: item.response.statusText,
              httpVersion: item.response.protocol || "HTTP/1.1",
              headers: formatHeaders(item.response.headers),
              content,
              headersSize: -1,
              bodySize: -1,
              redirectURL: "",
            }
          : {
              status: 0,
              statusText: "Failed",
              httpVersion: "",
              headers: [],
              content: {},
              headersSize: -1,
              bodySize: -1,
            },
        cache: {},
        timings: { send: 0, wait: 0, receive: 0 },
      };
    })
    .filter(Boolean);

  return {
    log: {
      version: "1.2",
      creator: { name: "Chrome Extension", version: "1.0" },
      entries,
    },
  };
}

function formatHeaders(headersObj) {
  return Object.keys(headersObj || {}).map((k) => ({
    name: k,
    value: String(headersObj[k]),
  }));
}
