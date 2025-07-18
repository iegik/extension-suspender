// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// Configuration
const DEFAULT_INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const SUSPENDED_URL_PREFIX = 'about:blank#';

// State management
let suspendedTabs = new Map(); // tabId -> originalUrl
let tabActivityTimers = new Map(); // tabId -> timer
let settings = {
  inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
  enabled: true
};

// Load settings from storage
browser.storage.local.get(['inactivityTimeout', 'enabled'], (result) => {
  if (result.inactivityTimeout !== undefined) {
    settings.inactivityTimeout = result.inactivityTimeout;
  }
  if (result.enabled !== undefined) {
    settings.enabled = result.enabled;
  }
});

// Helper functions
function isSuspendedUrl(url) {
  return url.startsWith(SUSPENDED_URL_PREFIX);
}

function getOriginalUrl(suspendedUrl) {
  if (isSuspendedUrl(suspendedUrl)) {
    return suspendedUrl.substring(SUSPENDED_URL_PREFIX.length);
  }
  return suspendedUrl;
}

function createSuspendedUrl(originalUrl) {
  return SUSPENDED_URL_PREFIX + originalUrl;
}

function shouldSuspendTab(tab) {
  // Don't suspend if extension is disabled
  if (!settings.enabled) return false;

  // Don't suspend special pages
  if (tab.url.startsWith('chrome://') ||
      tab.url.startsWith('moz-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('data:') ||
      tab.url.startsWith('file://')) {
    return false;
  }

  // Don't suspend if already suspended
  if (isSuspendedUrl(tab.url)) return false;

  return true;
}

function suspendTab(tabId) {
  browser.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;

    if (!shouldSuspendTab(tab)) return;

    const originalUrl = tab.url;
    const suspendedUrl = createSuspendedUrl(originalUrl);

    // Store original URL
    suspendedTabs.set(tabId, originalUrl);

    // Try to stop background tasks before suspending
    browser.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      // Send message to stop background tasks
      browser.tabs.sendMessage(tabId, { action: 'stopBackgroundTasks' }, () => {
        // Navigate to suspended URL
        browser.tabs.update(tabId, { url: suspendedUrl });
        console.log(`Suspended tab ${tabId}: ${originalUrl}`);
      });
    });
  });
}

function restoreTab(tabId) {
  const originalUrl = suspendedTabs.get(tabId);
  if (originalUrl) {
    browser.tabs.update(tabId, { url: originalUrl });
    suspendedTabs.delete(tabId);
    console.log(`Restored tab ${tabId}: ${originalUrl}`);
  }
}

function resetActivityTimer(tabId) {
  // Clear existing timer
  const existingTimer = tabActivityTimers.get(tabId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    suspendTab(tabId);
    tabActivityTimers.delete(tabId);
  }, settings.inactivityTimeout);

  tabActivityTimers.set(tabId, timer);
}

function clearActivityTimer(tabId) {
  const timer = tabActivityTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    tabActivityTimers.delete(tabId);
  }
}

// Event listeners
browser.tabs.onActivated.addListener((activeInfo) => {
  // Clear timer for newly active tab
  clearActivityTimer(activeInfo.tabId);

  // Restore if suspended
  browser.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;

    if (isSuspendedUrl(tab.url)) {
      restoreTab(activeInfo.tabId);
    }
  });
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process if URL changed and tab is complete
  if (!changeInfo.url || changeInfo.status !== 'complete') return;

  // If this is a suspended URL being loaded, restore it
  if (isSuspendedUrl(changeInfo.url)) {
    restoreTab(tabId);
    return;
  }

  // If this is a regular URL and tab is not active, start inactivity timer
  if (shouldSuspendTab(tab)) {
    browser.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      const isActive = activeTabs.some(activeTab => activeTab.id === tabId);
      if (!isActive) {
        resetActivityTimer(tabId);
      }
    });
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  // Clean up timers and suspended tab data
  clearActivityTimer(tabId);
  suspendedTabs.delete(tabId);
});

browser.webNavigation.onBeforeNavigate.addListener((details) => {
  // If navigating to a suspended URL, restore the original URL
  if (isSuspendedUrl(details.url)) {
    const originalUrl = getOriginalUrl(details.url);
    browser.tabs.update(details.tabId, { url: originalUrl });
  }
});

// Settings management
browser.storage.onChanged.addListener((changes) => {
  if (changes.inactivityTimeout) {
    settings.inactivityTimeout = changes.inactivityTimeout.newValue;
  }
  if (changes.enabled) {
    settings.enabled = changes.enabled.newValue;

    // If disabled, restore all suspended tabs
    if (!settings.enabled) {
      suspendedTabs.forEach((originalUrl, tabId) => {
        restoreTab(tabId);
      });
    }
  }
});

// Extension action click handler
browser.action.onClicked.addListener((tab) => {
  // Toggle suspension for current tab
  if (isSuspendedUrl(tab.url)) {
    restoreTab(tab.id);
  } else if (shouldSuspendTab(tab)) {
    suspendTab(tab.id);
  }
});

// Initialize: Set up timers for existing tabs
browser.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    if (shouldSuspendTab(tab)) {
      browser.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        const isActive = activeTabs.some(activeTab => activeTab.id === tab.id);
        if (!isActive) {
          resetActivityTimer(tab.id);
        }
      });
    }
  });
});

// Handle extension installation/update
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Set default settings
    browser.storage.local.set({
      inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
      enabled: true
    });
  }
});