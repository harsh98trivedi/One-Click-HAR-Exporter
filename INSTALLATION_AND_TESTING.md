# Installation and Testing Guide

## Issues Fixed

### ✅ Critical Fix: Duplicate "action" Key in manifest.json

**Problem:** The `manifest.json` file had duplicate `"action"` keys (lines 9-11 and 15-21), which is invalid JSON and would prevent the extension from loading.

**Solution:** Merged both action definitions into a single object containing both `default_popup` and `default_icon` properties.

**Before:**
```json
"action": {
  "default_popup": "popup.html"
},
"background": {
  "service_worker": "background.js"
},
"action": {
  "default_icon": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
},
```

**After:**
```json
"action": {
  "default_popup": "popup.html",
  "default_icon": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
},
"background": {
  "service_worker": "background.js"
},
```

---

## How to Install the Extension

1. **Open Chrome Extensions Page:**
   - Type `chrome://extensions/` in your address bar and press Enter
   - OR click the three-dot menu → Extensions → Manage Extensions

2. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension:**
   - Click the "Load unpacked" button
   - Navigate to and select the folder: `e:\Softs\HAR Exporter`
   - Click "Select Folder"

4. **Verify Installation:**
   - You should see "One-Click HAR Exporter" appear in your extensions list
   - The extension icon should appear in your Chrome toolbar
   - No errors should be displayed

---

## How to Test the Extension

### Basic Test

1. **Open a Test Website:**
   - Navigate to any website (e.g., `https://example.com`)

2. **Open the Extension:**
   - Click the "One-Click HAR Exporter" icon in your toolbar
   - You should see a popup with a "Record & Download HAR" button

3. **Start Recording:**
   - Click "Record & Download HAR"
   - Status should change from:
     - "Ready" → "Initializing..." → "Recording..." → "Processing..." → "Downloading..." → "Done!"

4. **Check Downloaded Files:**
   - Look in your Downloads folder
   - You should find a file named `<page-title>.har`
   - If console logs were captured, you'll also see `<page-title>_Console.txt`

### Advanced Test

1. **Test with Network Activity:**
   - Navigate to a page with lots of network requests (e.g., `https://www.google.com`)
   - Click the extension icon and start recording
   - Wait for the page to fully load
   - Check the downloaded HAR file

2. **Verify HAR Content:**
   - Open the `.har` file in a text editor or HAR viewer
   - Verify it contains:
     - Request URLs
     - HTTP methods (GET, POST, etc.)
     - Status codes (200, 404, etc.)
     - Request and response headers
     - Response bodies (when accessible)

3. **Test Filename Sanitization:**
   - Navigate to a page with special characters in the title
   - Record and download HAR
   - Verify the filename doesn't contain forbidden characters like: `\ / : * ? " < > |`

---

## Extension Functionality Overview

### What the Extension Does:

1. **Attaches Chrome Debugger:** Uses Chrome's Debugger API to monitor network activity
2. **Captures Network Logs:** Records all HTTP/HTTPS requests and responses
3. **Captures Console Logs:** Optionally records browser console messages
4. **Generates HAR File:** Converts captured data into HAR 1.2 format
5. **Auto-Downloads:** Saves files with clean, descriptive filenames based on page title
6. **Auto-Cleanup:** Detaches debugger and clears session data after export

### Key Features:

- ✅ One-click operation (no DevTools needed)
- ✅ Automatic page reload to capture all requests
- ✅ Clean filename generation from page title
- ✅ HAR 1.2 compliant output
- ✅ Optional console log export
- ✅ Privacy-focused (no external servers)
- ✅ Works on all websites
- ✅ Manifest V3 compatible

---

## Troubleshooting

### Extension Won't Load

**Symptom:** Error when clicking "Load unpacked"

**Solution:**
- Verify the manifest.json has no syntax errors
- Make sure all icon files exist in the `images` folder
- Check Chrome console for specific error messages

### HAR Not Downloading

**Symptom:** Recording starts but no file appears

**Solutions:**
- Check Chrome's Downloads settings (ensure downloads aren't blocked)
- Make sure you didn't close/switch tabs during recording
- Check browser console for errors (F12 → Console)
- Verify the debugger permission is granted

### Downloaded File Has Wrong Name

**Symptom:** File downloads as `download.json` or similar

**Solutions:**
- This should not happen with the current implementation
- The extension uses `chrome.downloads.onDeterminingFilename` to force correct naming
- If this occurs, check browser console for errors

### Missing Response Bodies

**Symptom:** HAR file has empty response bodies

**Explanation:**
- Some websites block body extraction for security reasons
- CORS policies may prevent access to cross-origin responses
- This is a browser security limitation, not an extension bug

---

## Code Structure

### Files Overview:

- **`manifest.json`** — Extension configuration and permissions
- **`background.js`** — Service worker that handles:
  - Debugger attachment/detachment
  - Network event listening
  - Console log capture
  - HAR generation
  - File downloads
- **`popup.html`** — User interface with button and status display
- **`popup.js`** — UI logic and message handling
- **`images/`** — Extension icons (16x16, 48x48, 128x128)

### Permissions Explained:

| Permission | Purpose |
|------------|---------|
| `debugger` | Attach to tabs and capture network traffic via Chrome Debugger Protocol |
| `activeTab` | Temporary access to the currently active tab |
| `tabs` | Query tab information (ID, title, URL) |
| `downloads` | Save HAR and console log files to disk |
| `<all_urls>` | Allow capture on any website |

---

## Next Steps

After installation and testing:

1. **Use for Development:** Capture HAR files for debugging network issues
2. **Share HAR Files:** Send to support teams for troubleshooting
3. **Analyze Performance:** Import HAR files into tools like:
   - Chrome DevTools (Network tab → Import HAR)
   - [HAR Viewer](http://www.softwareishard.com/har/viewer/)
   - [Google's HAR Analyzer](https://toolbox.googleapps.com/apps/har_analyzer/)

---

## Privacy & Security

- ✅ No telemetry or analytics
- ✅ No external network requests
- ✅ All processing happens locally
- ✅ Files stored only on your device
- ✅ Source code is fully auditable
- ✅ No data collection or transmission

---

## Support

For issues or questions:

- **GitHub Issues:** [harsh98trivedi/One-Click-HAR-Exporter/issues](https://github.com/harsh98trivedi/One-Click-HAR-Exporter/issues)
- **Developer:** [Harsh Trivedi](https://harsh98trivedi.github.io)

---

## License

See [LICENSE](LICENSE) file for details.
