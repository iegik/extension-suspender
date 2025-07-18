// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// Configuration
const DEFAULT_INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute
const SUSPENDED_URL_PREFIX = 'about:blank#';

// State management with persistence
let suspendedTabs = new Map(); // tabId -> originalUrl
let tabActivityTimers = new Map(); // tabId -> timer
let settings = {
  inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
  enabled: true
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
      suspendedTabs = new Map(Object.entries(result.suspendedTabs));
    }
  } catch (error) {
    console.error('Error loading persisted state:', error);
  }
}

// Save suspended tabs to storage
async function saveSuspendedTabs() {
  try {
    const suspendedTabsObject = Object.fromEntries(suspendedTabs);
    await new Promise((resolve, reject) => {
      browser.storage.local.set({ suspendedTabs: suspendedTabsObject }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Error saving suspended tabs:', error);
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

// Improved suspendTab function with proper async handling
async function suspendTab(tabId) {
  try {
    // Get tab information
    const tab = await new Promise((resolve, reject) => {
      browser.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });

    if (!shouldSuspendTab(tab)) {
      console.log(`Tab ${tabId} should not be suspended`);
      return;
    }

    const originalUrl = tab.url;
    const suspendedUrl = createSuspendedUrl(originalUrl);

    // Store original URL
    suspendedTabs.set(tabId, originalUrl);
    await saveSuspendedTabs();

    // Step 1: Inject content script
    await new Promise((resolve, reject) => {
      browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('Content script injection failed:', chrome.runtime.lastError.message);
          // Continue anyway, as suspension can still work without background task stopping
          resolve();
        } else {
          resolve();
        }
      });
    });

    // Step 2: Send message to stop background tasks with timeout
    try {
      await Promise.race([
        new Promise((resolve, reject) => {
          browser.tabs.sendMessage(tabId, { action: 'stopBackgroundTasks' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Message timeout')), 2000);
        })
      ]);
      console.log(`Background tasks stopped for tab ${tabId}`);
    } catch (error) {
      console.warn(`Could not stop background tasks for tab ${tabId}:`, error.message);
      // Continue with suspension even if background task stopping fails
    }

    // Step 3: Navigate to suspended URL
    await new Promise((resolve, reject) => {
      browser.tabs.update(tabId, { url: suspendedUrl }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    console.log(`Successfully suspended tab ${tabId}: ${originalUrl}`);
  } catch (error) {
    console.error(`Failed to suspend tab ${tabId}:`, error.message);
    // Clean up state on failure
    suspendedTabs.delete(tabId);
    clearActivityTimer(tabId);
    await saveSuspendedTabs();
  }
}

// Improved restoreTab function with proper async handling
async function restoreTab(tabId) {
  try {
    const originalUrl = suspendedTabs.get(tabId);
    if (!originalUrl) {
      console.log(`No original URL found for tab ${tabId}`);
      return;
    }

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
    console.log(`Successfully restored tab ${tabId}: ${originalUrl}`);
  } catch (error) {
    console.error(`Failed to restore tab ${tabId}:`, error.message);
  }
}

function resetActivityTimer(tabId) {
  // Clear existing timer
  const existingTimer = tabActivityTimers.get(tabId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(async () => {
    try {
      await suspendTab(tabId);
    } catch (error) {
      console.error(`Timer-based suspension failed for tab ${tabId}:`, error.message);
    } finally {
      tabActivityTimers.delete(tabId);
    }
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

// Event listeners with improved error handling
browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // Clear timer for newly active tab
    clearActivityTimer(activeInfo.tabId);

    // Restore if suspended
    const tab = await new Promise((resolve, reject) => {
      browser.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });

    if (isSuspendedUrl(tab.url)) {
      await restoreTab(activeInfo.tabId);
    }
  } catch (error) {
    console.error('Error handling tab activation:', error.message);
  }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Only process if URL changed and tab is complete
    if (!changeInfo.url || changeInfo.status !== 'complete') return;

    // If this is a suspended URL being loaded, restore it
    if (isSuspendedUrl(changeInfo.url)) {
      await restoreTab(tabId);
      return;
    }

    // If this is a regular URL and tab is not active, start inactivity timer
    if (shouldSuspendTab(tab)) {
      const activeTabs = await new Promise((resolve, reject) => {
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      });

      const isActive = activeTabs.some(activeTab => activeTab.id === tabId);
      if (!isActive) {
        resetActivityTimer(tabId);
      }
    }
  } catch (error) {
    console.error('Error handling tab update:', error.message);
  }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  try {
    // Clean up timers and suspended tab data
    clearActivityTimer(tabId);
    suspendedTabs.delete(tabId);
    await saveSuspendedTabs();
  } catch (error) {
    console.error('Error handling tab removal:', error.message);
  }
});

browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
  try {
    // If navigating to a suspended URL, restore the original URL
    if (isSuspendedUrl(details.url)) {
      const originalUrl = getOriginalUrl(details.url);
      await new Promise((resolve, reject) => {
        browser.tabs.update(details.tabId, { url: originalUrl }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
  } catch (error) {
    console.error('Error handling navigation:', error.message);
  }
});

// Settings management
browser.storage.onChanged.addListener(async (changes) => {
  try {
    if (changes.inactivityTimeout) {
      console.log('Timeout changed to:', changes.inactivityTimeout.newValue / 1000, 'seconds');
      settings.inactivityTimeout = changes.inactivityTimeout.newValue;

      // Reset all timers with new timeout
      const currentTabs = await new Promise((resolve, reject) => {
        browser.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      });

      console.log('Found', currentTabs.length, 'tabs');

      // Clear all existing timers
      for (const [tabId, timer] of tabActivityTimers) {
        clearTimeout(timer);
        tabActivityTimers.delete(tabId);
      }

      // Reset timers for non-active tabs
      const activeTabs = await new Promise((resolve, reject) => {
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      });

      console.log('Active tabs:', activeTabs.map(t => t.id));

      for (const tab of currentTabs) {
        if (shouldSuspendTab(tab) && !activeTabs.some(activeTab => activeTab.id === tab.id)) {
          console.log('Starting timer for tab:', tab.id, tab.url);
          resetActivityTimer(tab.id);
        } else {
          console.log('Not starting timer for tab:', tab.id, 'shouldSuspendTab:', shouldSuspendTab(tab), 'isActive:', activeTabs.some(activeTab => activeTab.id === tab.id));
        }
      }
    }

    if (changes.enabled) {
      console.log('Extension enabled changed to:', changes.enabled.newValue);
      settings.enabled = changes.enabled.newValue;

      // If disabled, restore all suspended tabs
      if (!settings.enabled) {
        for (const [tabId, originalUrl] of suspendedTabs) {
          try {
            await restoreTab(tabId);
          } catch (error) {
            console.error(`Failed to restore tab ${tabId} when disabling:`, error.message);
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

// Initialize: Set up timers for existing tabs
browser.tabs.query({}, async (tabs) => {
  try {
    const activeTabs = await new Promise((resolve, reject) => {
      browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tabs);
        }
      });
    });

    for (const tab of tabs) {
      if (shouldSuspendTab(tab)) {
        const isActive = activeTabs.some(activeTab => activeTab.id === tab.id);
        if (!isActive) {
          resetActivityTimer(tab.id);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing timers:', error.message);
  }
});

// Handle extension installation/update
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Set default settings
    browser.storage.local.set({
      inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
      enabled: true
    }, () => {
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

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  try {
    // Clean up any orphaned timers
    const currentTabs = Array.from(tabActivityTimers.keys());
    browser.tabs.query({}, (tabs) => {
      const existingTabIds = tabs.map(tab => tab.id);
      for (const tabId of currentTabs) {
        if (!existingTabIds.includes(tabId)) {
          clearActivityTimer(tabId);
          suspendedTabs.delete(tabId);
        }
      }
    });
  } catch (error) {
    console.error('Error during periodic cleanup:', error);
  }
}, 60000); // Run every minute