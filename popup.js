const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");
const spinner = document.getElementById("spinner");

startBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    updateUI("Initializing...", true);
    chrome.runtime.sendMessage({ action: "start_recording", tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "update_status") {
    if (msg.text.includes("Done") || msg.text.includes("Error")) {
      updateUI(msg.text, false);
    } else {
      updateUI(msg.text, true);
    }
  }
});

function updateUI(text, isLoading) {
  statusText.innerText = text;
  if (isLoading) {
    startBtn.disabled = true;
    spinner.style.display = "block";
  } else {
    startBtn.disabled = false;
    spinner.style.display = "none";
  }
}
