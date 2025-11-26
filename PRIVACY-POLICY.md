# Privacy Policy for One-Click HAR Exporter

Thank you for using the One-Click HAR Exporter Chrome Extension. This privacy policy explains how the extension handles your data.

## Data Collection and Usage

The One-Click HAR Exporter extension is designed with privacy as a core priority.

- **No Personal Data is Collected:**  
  The extension does not collect, store, or transmit any personally identifiable information (PII), such as your name, email address, browsing history, or credentials.

- **No Data Transmission:**  
  All operations performed by the extension happen locally in your browser.  
  **No information—including HAR data, console logs, or page details—is sent to any external server.**

- **Local Processing Only:**  
  When you click “Record & Download,” the extension temporarily listens to network activity on the current tab for the sole purpose of generating a HAR file.  
  This data is used **only to produce the downloadable HAR file** and is immediately discarded afterward.

- **Website Interaction:**  
  The extension interacts with the active webpage only to:

  - capture network requests and responses,
  - optionally capture console logs,
  - retrieve the page title to name the exported file.

  It performs **no background scanning** and runs **only when you activate it**.

## Permissions

The extension requires the following permissions for its functionality:

- **`debugger`** — To access the tab’s network activity and generate a HAR file.
- **`downloads`** — To save the HAR file (and optional console log) to your device.
- **`activeTab`** — To run only on the tab you choose and fetch its title.
- **`tabs`** — To verify and access basic tab information needed for file naming.

These permissions are used strictly for the extension’s single purpose:  
**capturing and exporting HAR data locally on your device.**

## Changes to This Privacy Policy

This Privacy Policy may be updated in the future if the extension’s features change.  
Any updates will be reflected in a new version of the extension and an updated policy document.

## Contact Us

If you have any questions about this Privacy Policy, you can contact us via the support link on the Chrome Web Store listing.
