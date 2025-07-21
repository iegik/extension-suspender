// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// Configuration
const SUSPENDED_URL_PREFIX = 'about:blank#';
const minutes = 60 * 1000;

// State management with persistence
let suspendedTabs = new Set(); // Set of suspended tabIds
// Use a WeakMap for tabActivityTimers if possible (tabId is a number, so fallback to Map)
let tabActivityTimers = new Map(); // tabId -> timer
const defaultSettings = Object.freeze({
  inactivityTimeout: 1 * minutes, // 1 minute
  enabled: true
});

const settings = {
  ...defaultSettings
};

// Load settings and suspended tabs from storage
async function loadPersistedState() {
  try {
    const result = await new Promise((resolve, reject) => {
      browser.storage.local.get(['inactivityTimeout', 'enabled', 'suspendedTabs'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });

    if (result.inactivityTimeout !== undefined) {
      settings.inactivityTimeout = result.inactivityTimeout;
    }
    if (result.enabled !== undefined) {
      settings.enabled = result.enabled;
    }
    if (result.suspendedTabs) {
      suspendedTabs = new Set(result.suspendedTabs);
    }
  } catch (error) {
    console.debug('Error loading persisted state:', error);
  }
}

// Save suspended tabs to storage
async function saveSuspendedTabs() {
  try {
    await new Promise((resolve, reject) => {
      browser.storage.local.set({ suspendedTabs: Array.from(suspendedTabs) }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.debug('Error saving suspended tabs:', error);
  }
}

// Cleanup function for service worker
function cleanup() {
  try {
    // Clear all timers
    for (const [tabId, timer] of tabActivityTimers) {
      clearTimeout(timer);
    }
    tabActivityTimers.clear();

    // Save state before cleanup
    saveSuspendedTabs();

    console.log('Service worker cleanup completed');
  } catch (error) {
    console.error('Error during service worker cleanup:', error);
  }
}

// Initialize state
loadPersistedState();

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
  if (!settings.enabled) return false;
  if (tab.url.startsWith('chrome://') ||
      tab.url.startsWith('moz-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('data:') ||
      tab.url.startsWith('file://')) return false;
  if (isSuspendedUrl(tab.url)) return false;
  return true;
}

async function suspendTab(tabId) {
  try {
    if (suspendedTabs.has(tabId)) return;
    const tab = await new Promise((resolve, reject) => {
      browser.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
    if (!shouldSuspendTab(tab)) return;
    const suspendedUrl = createSuspendedUrl(tab.url);
    suspendedTabs.add(tabId);
    await saveSuspendedTabs();
    await new Promise((resolve, reject) => {
      browser.tabs.update(tabId, { url: suspendedUrl }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    suspendedTabs.delete(tabId);
    clearActivityTimer(tabId);
    await saveSuspendedTabs();
  }
}

async function restoreTab(tabId) {
  try {
    if (!suspendedTabs.has(tabId)) return;
    const tab = await new Promise((resolve, reject) => {
      browser.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
    const originalUrl = getOriginalUrl(tab.url);
    await new Promise((resolve, reject) => {
      browser.tabs.update(tabId, { url: originalUrl }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
    suspendedTabs.delete(tabId);
    await saveSuspendedTabs();
  } catch (error) {}
}

function resetActivityTimer(tabId) {
  if (suspendedTabs.has(tabId)) return;
  const existingTimer = tabActivityTimers.get(tabId);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(async () => {
    try {
      await suspendTab(tabId);
    } catch (error) {}
    finally {
      tabActivityTimers.delete(tabId);
    }
  }, settings.inactivityTimeout);
  tabActivityTimers.set(tabId, timer);
}

function clearActivityTimer(tabId) {
  const timer = tabActivityTimers.get(tabId);
  if (!timer) return;
  clearTimeout(timer);
  tabActivityTimers.delete(tabId);
}

// Helper: Check if all tabs are suspended
async function areAllTabsSuspended() {
  const tabs = await new Promise((resolve, reject) => {
    browser.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(tabs);
    });
  });
  return tabs.every(tab => suspendedTabs.has(tab.id));
}

// Helper: Clear all timers and remove listeners
function clearAllTimersAndListeners() {
  // Clear all timers
  for (const [tabId, timer] of tabActivityTimers) {
    clearTimeout(timer);
  }
  tabActivityTimers.clear();

  // Remove event listeners
  if (browser.tabs.onActivated.hasListener(onTabActivated)) {
    browser.tabs.onActivated.removeListener(onTabActivated);
  }
  if (browser.tabs.onUpdated.hasListener(onTabUpdated)) {
    browser.tabs.onUpdated.removeListener(onTabUpdated);
  }
  if (browser.webNavigation.onBeforeNavigate.hasListener(onBeforeNavigate)) {
    browser.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigate);
  }
}

async function onTabActivated(activeInfo) {
  try {
    clearActivityTimer(activeInfo.tabId);
    if (suspendedTabs.has(activeInfo.tabId)) {
      await restoreTab(activeInfo.tabId);
    }
    const inactiveTabs = await new Promise((resolve, reject) => {
      browser.tabs.query({ active: false }, (tabs) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tabs);
      });
    });
    for (const tab of inactiveTabs) {
      if (!shouldSuspendTab(tab) || suspendedTabs.has(tab.id)) {
        clearActivityTimer(tab.id);
        continue;
      }
      resetActivityTimer(tab.id);
    }
  } catch (error) {}
}

async function onTabUpdated(tabId, changeInfo, tab) {
  try {
    if (suspendedTabs.has(tabId) && changeInfo.url && isSuspendedUrl(changeInfo.url)) {
      const activeTabs = await new Promise((resolve, reject) => {
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(tabs);
        });
      });
      const isActive = activeTabs.some(activeTab => activeTab.id === tabId);
      if (isActive) await restoreTab(tabId);
      return;
    }
    if (!changeInfo.url || changeInfo.status !== 'complete') return;
    if (!shouldSuspendTab(tab) || suspendedTabs.has(tabId)) {
      clearActivityTimer(tabId);
      return;
    }
    const activeTabs = await new Promise((resolve, reject) => {
      browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tabs);
      });
    });
    const isActive = activeTabs.some(activeTab => activeTab.id === tabId);
    if (!isActive) resetActivityTimer(tabId);
    else clearActivityTimer(tabId);
  } catch (error) {}
}

async function onBeforeNavigate(details) {
  try {
    if (suspendedTabs.has(details.tabId) && isSuspendedUrl(details.url)) {
      const activeTabs = await new Promise((resolve, reject) => {
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(tabs);
        });
      });
      const isActive = activeTabs.some(activeTab => activeTab.id === details.tabId);
      if (isActive) {
        const originalUrl = getOriginalUrl(details.url);
        await new Promise((resolve, reject) => {
          browser.tabs.update(details.tabId, { url: originalUrl }, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });
      }
    }
  } catch (error) {
    console.error('Error handling navigation:', error.message);
  }
}

// Register listeners
browser.tabs.onActivated.addListener(onTabActivated);
browser.tabs.onUpdated.addListener(onTabUpdated);
browser.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);

// Patch suspendTab to check if all tabs are suspended after each suspension
const originalSuspendTab = suspendTab;
suspendTab = async function(tabId) {
  await originalSuspendTab.call(this, tabId);
  if (await areAllTabsSuspended()) {
    clearAllTimersAndListeners();
  }
};

// Settings management
browser.storage.onChanged.addListener(async (changes) => {
  try {
    if (changes.inactivityTimeout) {
      console.log('Timeout changed to:', changes.inactivityTimeout.newValue / 1000, 'seconds');
      settings.inactivityTimeout = changes.inactivityTimeout.newValue;

      // Clear all existing timers
      for (const [tabId, timer] of tabActivityTimers) {
        clearTimeout(timer);
        tabActivityTimers.delete(tabId);
      }

      // Reset timers for inactive tabs only
      const inactiveTabs = await new Promise((resolve, reject) => {
        browser.tabs.query({ active: false }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      });

      for (const tab of inactiveTabs) {
        if (shouldSuspendTab(tab)) {
          resetActivityTimer(tab.id);
        }
      }
    }

    if (changes.enabled) {
      console.log('Extension enabled changed to:', changes.enabled.newValue);
      settings.enabled = changes.enabled.newValue;

      // If disabled, restore all suspended tabs
      if (!settings.enabled) {
        for (const tabId of suspendedTabs) {
          try {
            await restoreTab(tabId);
          } catch (error) {
            console.debug(`Failed to restore tab ${tabId} when disabling:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling settings change:', error.message);
  }
});

// Extension action click handler
browser.action.onClicked.addListener(async (tab) => {
  try {
    // Toggle suspension for current tab
    if (isSuspendedUrl(tab.url)) {
      await restoreTab(tab.id);
    } else if (shouldSuspendTab(tab)) {
      await suspendTab(tab.id);
    }
  } catch (error) {
    console.error('Error handling extension action click:', error.message);
  }
});

// Initialize: Set up timers for existing inactive tabs after settings are loaded
async function initializeTimers() {
  try {
    const inactiveTabs = await new Promise((resolve, reject) => {
      browser.tabs.query({ active: false }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tabs);
        }
      });
    });
    for (const tab of inactiveTabs) {
      if (!shouldSuspendTab(tab) || suspendedTabs.has(tab.id)) {
        clearActivityTimer(tab.id);
        continue;
      }
      resetActivityTimer(tab.id);
    }
  } catch (error) {}
}

// Initialize after settings are loaded
loadPersistedState().then(() => {
  console.debug('Settings loaded, initializing timers...');
  initializeTimers();
});

// Handle extension installation/update
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Set default settings
    browser.storage.local.set(defaultSettings, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to set default settings:', chrome.runtime.lastError.message);
      }
    });
  }
});

// Handle service worker lifecycle
browser.runtime.onSuspend.addListener(() => {
  cleanup();
});

// Note: Removed setInterval for periodic cleanup to prevent battery drain
// Garbage collection will handle cleanup automatically
// Orphaned timers will be cleaned up when tabs are removed via onRemoved event