// Popup script for Libby Downloader V2

console.log('[Libby Downloader] Popup loaded');

// Check if we're on a Libby page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];

  if (!currentTab) {
    showStatus('error', 'Could not access current tab');
    return;
  }

  const url = currentTab.url || '';

  if (!url.includes('libbyapp.com')) {
    showStatus('info', 'Navigate to Libby to download audiobooks');
    return;
  }

  if (!url.includes('/open/loan/')) {
    showStatus('info', 'Open an audiobook to download');
    return;
  }

  showStatus('success', 'Ready! Click the button on the page to download.');
});

// Show status message
function showStatus(type, message) {
  const statusDiv = document.getElementById('status');
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
}
