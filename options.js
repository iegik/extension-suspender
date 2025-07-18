// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// DOM elements
const enabledCheckbox = document.getElementById('enabled');
const timeoutInput = document.getElementById('timeout');
const saveButton = document.getElementById('save');
const statusSpan = document.getElementById('status');

// Load current settings
browser.storage.local.get(['enabled', 'inactivityTimeout'], (result) => {
  enabledCheckbox.checked = result.enabled !== false; // Default to true
  timeoutInput.value = Math.max(1, Math.min(60, (result.inactivityTimeout || 5 * 60 * 1000) / (60 * 1000)));
});

// Save settings
function saveSettings() {
  const enabled = enabledCheckbox.checked;
  const timeoutMinutes = parseInt(timeoutInput.value);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  browser.storage.local.set({
    enabled: enabled,
    inactivityTimeout: timeoutMs
  }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Error saving settings', true);
    } else {
      showStatus('Settings saved successfully');
    }
  });
}

// Show status message
function showStatus(message, isError = false) {
  statusSpan.textContent = message;
  statusSpan.className = isError ? 'error' : '';

  setTimeout(() => {
    statusSpan.textContent = '';
    statusSpan.className = '';
  }, 3000);
}

// Event listeners
saveButton.addEventListener('click', saveSettings);

// Auto-save on checkbox change
enabledCheckbox.addEventListener('change', () => {
  saveSettings();
});

// Auto-save on timeout input change (with debounce)
let timeoutDebounce;
timeoutInput.addEventListener('input', () => {
  clearTimeout(timeoutDebounce);
  timeoutDebounce = setTimeout(() => {
    saveSettings();
  }, 500);
});

// Validate timeout input
timeoutInput.addEventListener('blur', () => {
  const value = parseInt(timeoutInput.value);
  if (value < 1) {
    timeoutInput.value = 1;
  } else if (value > 60) {
    timeoutInput.value = 60;
  }
});