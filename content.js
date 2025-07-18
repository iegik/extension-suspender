// Content script to help with tab suspension
// This script runs in the context of web pages to help stop background tasks

// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// Track if content script is ready
let isContentScriptReady = false;

// Store original functions to restore them later
const originalFunctions = {
  Worker: null,
  setTimeout: null,
  setInterval: null,
  requestAnimationFrame: null,
  fetch: null,
  XMLHttpRequestOpen: null
};

// Track resources with proper cleanup
const resourceTrackers = {
  workers: new Set(),
  timers: new Set(),
  intervals: new Set(),
  animationFrames: new Set(),
  fetchControllers: new Set(),
  xhrRequests: new Set()
};

// Function to restore original functions
function restoreOriginalFunctions() {
  try {
    if (originalFunctions.Worker && window.Worker !== originalFunctions.Worker) {
      window.Worker = originalFunctions.Worker;
    }
    if (originalFunctions.setTimeout && window.setTimeout !== originalFunctions.setTimeout) {
      window.setTimeout = originalFunctions.setTimeout;
    }
    if (originalFunctions.setInterval && window.setInterval !== originalFunctions.setInterval) {
      window.setInterval = originalFunctions.setInterval;
    }
    if (originalFunctions.requestAnimationFrame && window.requestAnimationFrame !== originalFunctions.requestAnimationFrame) {
      window.requestAnimationFrame = originalFunctions.requestAnimationFrame;
    }
    if (originalFunctions.fetch && window.fetch !== originalFunctions.fetch) {
      window.fetch = originalFunctions.fetch;
    }
    if (originalFunctions.XMLHttpRequestOpen && XMLHttpRequest.prototype.open !== originalFunctions.XMLHttpRequestOpen) {
      XMLHttpRequest.prototype.open = originalFunctions.XMLHttpRequestOpen;
    }
  } catch (error) {
    console.error('Error restoring original functions:', error);
  }
}

// Function to clean up all tracked resources
function cleanupTrackedResources() {
  try {
    // Clear all sets
    resourceTrackers.workers.clear();
    resourceTrackers.timers.clear();
    resourceTrackers.intervals.clear();
    resourceTrackers.animationFrames.clear();
    resourceTrackers.fetchControllers.clear();
    resourceTrackers.xhrRequests.clear();

    // Remove any global variables we added
    delete window._originalWorker;
    delete window._activeWorkers;
    delete window._trackedTimers;
    delete window._trackedIntervals;
    delete window._originalRequestAnimationFrame;
    delete window._animationFrameIds;
    delete window._originalFetch;
    delete window._activeAbortControllers;
    delete window._originalXHROpen;
    delete window._activeXHRs;

    console.log('Cleaned up all tracked resources');
  } catch (error) {
    console.error('Error cleaning up resources:', error);
  }
}

// Function to stop web workers with proper cleanup
function stopWebWorkers() {
  try {
    // Store original Worker if not already stored
    if (!originalFunctions.Worker) {
      originalFunctions.Worker = window.Worker;
    }

    // Override Worker constructor to track workers
    if (window.Worker && window.Worker === originalFunctions.Worker) {
      window.Worker = function(scriptURL, options) {
        const worker = new originalFunctions.Worker(scriptURL, options);
        resourceTrackers.workers.add(worker);

        // Remove from set when worker terminates
        worker.addEventListener('error', () => {
          resourceTrackers.workers.delete(worker);
        });

        return worker;
      };
    }

    // Terminate all active workers
    let terminatedCount = 0;
    resourceTrackers.workers.forEach(worker => {
      try {
        worker.terminate();
        terminatedCount++;
      } catch (e) {
        console.log('Could not terminate worker:', e);
      }
    });
    resourceTrackers.workers.clear();
    console.log(`Terminated ${terminatedCount} web workers`);
  } catch (error) {
    console.error('Error stopping web workers:', error);
  }
}

// Function to stop timers and intervals with better tracking
function stopTimers() {
  try {
    // Store original functions if not already stored
    if (!originalFunctions.setTimeout) {
      originalFunctions.setTimeout = window.setTimeout;
    }
    if (!originalFunctions.setInterval) {
      originalFunctions.setInterval = window.setInterval;
    }

    // Override setTimeout to track timers
    if (window.setTimeout === originalFunctions.setTimeout) {
      window.setTimeout = function(fn, delay, ...args) {
        const id = originalFunctions.setTimeout(fn, delay, ...args);
        resourceTrackers.timers.add(id);
        return id;
      };
    }

    // Override setInterval to track intervals
    if (window.setInterval === originalFunctions.setInterval) {
      window.setInterval = function(fn, delay, ...args) {
        const id = originalFunctions.setInterval(fn, delay, ...args);
        resourceTrackers.intervals.add(id);
        return id;
      };
    }

    // Clear tracked timers
    let clearedTimers = 0;
    resourceTrackers.timers.forEach(id => {
      try {
        clearTimeout(id);
        clearedTimers++;
      } catch (e) {
        console.log('Could not clear timer:', e);
      }
    });
    resourceTrackers.timers.clear();

    // Clear tracked intervals
    let clearedIntervals = 0;
    resourceTrackers.intervals.forEach(id => {
      try {
        clearInterval(id);
        clearedIntervals++;
      } catch (e) {
        console.log('Could not clear interval:', e);
      }
    });
    resourceTrackers.intervals.clear();

    console.log(`Cleared ${clearedTimers} timers and ${clearedIntervals} intervals`);
  } catch (error) {
    console.error('Error stopping timers:', error);
  }
}

// Function to stop requestAnimationFrame
function stopAnimationFrames() {
  try {
    // Store original function if not already stored
    if (!originalFunctions.requestAnimationFrame) {
      originalFunctions.requestAnimationFrame = window.requestAnimationFrame;
    }

    // Cancel all tracked animation frames
    let cancelledFrames = 0;
    resourceTrackers.animationFrames.forEach(id => {
      try {
        cancelAnimationFrame(id);
        cancelledFrames++;
      } catch (e) {
        console.log('Could not cancel animation frame:', e);
      }
    });
    resourceTrackers.animationFrames.clear();
    console.log(`Cancelled ${cancelledFrames} animation frames`);

    // Override requestAnimationFrame to track frames
    if (window.requestAnimationFrame === originalFunctions.requestAnimationFrame) {
      window.requestAnimationFrame = function(callback) {
        const id = originalFunctions.requestAnimationFrame(callback);
        resourceTrackers.animationFrames.add(id);
        return id;
      };
    }
  } catch (error) {
    console.error('Error stopping animation frames:', error);
  }
}

// Function to stop fetch requests
function stopFetchRequests() {
  try {
    // Store original function if not already stored
    if (!originalFunctions.fetch) {
      originalFunctions.fetch = window.fetch;
    }

    // Override fetch to track requests
    if (window.fetch === originalFunctions.fetch) {
      window.fetch = function(input, init) {
        const controller = new AbortController();
        resourceTrackers.fetchControllers.add(controller);

        const promise = originalFunctions.fetch(input, {
          ...init,
          signal: controller.signal
        });

        // Remove controller when request completes
        promise.finally(() => {
          resourceTrackers.fetchControllers.delete(controller);
        });

        return promise;
      };
    }

    // Abort all active requests
    let abortedRequests = 0;
    resourceTrackers.fetchControllers.forEach(controller => {
      try {
        controller.abort();
        abortedRequests++;
      } catch (e) {
        console.log('Could not abort request:', e);
      }
    });
    resourceTrackers.fetchControllers.clear();
    console.log(`Aborted ${abortedRequests} fetch requests`);
  } catch (error) {
    console.error('Error stopping fetch requests:', error);
  }
}

// Function to stop XMLHttpRequest
function stopXHRRequests() {
  try {
    // Store original function if not already stored
    if (!originalFunctions.XMLHttpRequestOpen) {
      originalFunctions.XMLHttpRequestOpen = XMLHttpRequest.prototype.open;
    }

    // Override XMLHttpRequest.open to track requests
    if (XMLHttpRequest.prototype.open === originalFunctions.XMLHttpRequestOpen) {
      XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        resourceTrackers.xhrRequests.add(this);
        return originalFunctions.XMLHttpRequestOpen.call(this, method, url, async, user, password);
      };
    }

    // Abort all active XHR requests
    let abortedXHRs = 0;
    resourceTrackers.xhrRequests.forEach(xhr => {
      try {
        if (xhr.readyState !== 4) { // Not completed
          xhr.abort();
          abortedXHRs++;
        }
      } catch (e) {
        console.log('Could not abort XHR:', e);
      }
    });
    resourceTrackers.xhrRequests.clear();
    console.log(`Aborted ${abortedXHRs} XMLHttpRequest calls`);
  } catch (error) {
    console.error('Error stopping XMLHttpRequest calls:', error);
  }
}

// Main function to stop all background tasks
function stopBackgroundTasks() {
  console.log('Stopping background tasks for tab suspension');

  try {
    stopWebWorkers();
    stopTimers();
    stopAnimationFrames();
    stopFetchRequests();
    stopXHRRequests();

    return {
      success: true,
      message: 'Background tasks stopped successfully'
    };
  } catch (error) {
    console.error('Error stopping background tasks:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to restore all original functions
function restoreAllOriginalFunctions() {
  try {
    restoreOriginalFunctions();
    cleanupTrackedResources();
    console.log('Restored all original functions');
  } catch (error) {
    console.error('Error restoring original functions:', error);
  }
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'stopBackgroundTasks') {
      const result = stopBackgroundTasks();
      sendResponse(result);
    } else if (message.action === 'restoreFunctions') {
      restoreAllOriginalFunctions();
      sendResponse({ success: true, message: 'Functions restored' });
    } else if (message.action === 'ping') {
      // Respond to ping to confirm content script is ready
      sendResponse({ success: true, ready: isContentScriptReady });
    } else {
      sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Initialize tracking on page load
function initializeTracking() {
  try {
    // Set up tracking for new resources
    stopWebWorkers();
    stopAnimationFrames();
    stopFetchRequests();
    stopXHRRequests();

    isContentScriptReady = true;
    console.log('Content script initialized and ready');
  } catch (error) {
    console.error('Error initializing content script:', error);
  }
}

// Cleanup function for when content script is unloaded
function cleanup() {
  try {
    restoreOriginalFunctions();
    cleanupTrackedResources();
    console.log('Content script cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracking);
} else {
  // DOM already loaded, initialize immediately
  initializeTracking();
}

// Also initialize after a short delay to catch any late-loading resources
setTimeout(initializeTracking, 1000);

// Cleanup when page is unloaded
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Cleanup when content script is removed (for dynamic injection)
if (typeof window !== 'undefined') {
  // Store cleanup function globally so it can be called if needed
  window.__tabSuspenderCleanup = cleanup;
}