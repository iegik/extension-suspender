// Content script to help with tab suspension
// This script runs in the context of web pages to help stop background tasks

// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// Track if content script is ready
let isContentScriptReady = false;

// Function to stop web workers
function stopWebWorkers() {
  try {
    // Override Worker constructor to track workers
    if (window.Worker && !window._originalWorker) {
      window._originalWorker = window.Worker;
      window._activeWorkers = new Set();

      window.Worker = function(scriptURL, options) {
        const worker = new window._originalWorker(scriptURL, options);
        window._activeWorkers.add(worker);

        // Remove from set when worker terminates
        worker.addEventListener('error', () => {
          window._activeWorkers.delete(worker);
        });

        return worker;
      };
    }

    // Terminate all active workers
    if (window._activeWorkers) {
      let terminatedCount = 0;
      window._activeWorkers.forEach(worker => {
        try {
          worker.terminate();
          terminatedCount++;
        } catch (e) {
          console.log('Could not terminate worker:', e);
        }
      });
      window._activeWorkers.clear();
      console.log(`Terminated ${terminatedCount} web workers`);
    }
  } catch (error) {
    console.error('Error stopping web workers:', error);
  }
}

// Function to stop timers and intervals with better tracking
function stopTimers() {
  try {
    // Track timers we create
    if (!window._trackedTimers) {
      window._trackedTimers = new Set();
      window._trackedIntervals = new Set();

      // Override setTimeout to track timers
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = function(fn, delay, ...args) {
        const id = originalSetTimeout(fn, delay, ...args);
        window._trackedTimers.add(id);
        return id;
      };

      // Override setInterval to track intervals
      const originalSetInterval = window.setInterval;
      window.setInterval = function(fn, delay, ...args) {
        const id = originalSetInterval(fn, delay, ...args);
        window._trackedIntervals.add(id);
        return id;
      };
    }

    // Clear tracked timers
    let clearedTimers = 0;
    window._trackedTimers.forEach(id => {
      try {
        clearTimeout(id);
        clearedTimers++;
      } catch (e) {
        console.log('Could not clear timer:', e);
      }
    });
    window._trackedTimers.clear();

    // Clear tracked intervals
    let clearedIntervals = 0;
    window._trackedIntervals.forEach(id => {
      try {
        clearInterval(id);
        clearedIntervals++;
      } catch (e) {
        console.log('Could not clear interval:', e);
      }
    });
    window._trackedIntervals.clear();

    console.log(`Cleared ${clearedTimers} timers and ${clearedIntervals} intervals`);
  } catch (error) {
    console.error('Error stopping timers:', error);
  }
}

// Function to stop requestAnimationFrame
function stopAnimationFrames() {
  try {
    if (window._animationFrameIds) {
      let cancelledFrames = 0;
      window._animationFrameIds.forEach(id => {
        try {
          cancelAnimationFrame(id);
          cancelledFrames++;
        } catch (e) {
          console.log('Could not cancel animation frame:', e);
        }
      });
      window._animationFrameIds.clear();
      console.log(`Cancelled ${cancelledFrames} animation frames`);
    }

    // Override requestAnimationFrame to track frames
    if (!window._originalRequestAnimationFrame) {
      window._originalRequestAnimationFrame = window.requestAnimationFrame;
      window._animationFrameIds = new Set();

      window.requestAnimationFrame = function(callback) {
        const id = window._originalRequestAnimationFrame(callback);
        window._animationFrameIds.add(id);
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
    if (!window._originalFetch) {
      window._originalFetch = window.fetch;
      window._activeAbortControllers = new Set();

      window.fetch = function(input, init) {
        const controller = new AbortController();
        window._activeAbortControllers.add(controller);

        const promise = window._originalFetch(input, {
          ...init,
          signal: controller.signal
        });

        // Remove controller when request completes
        promise.finally(() => {
          window._activeAbortControllers.delete(controller);
        });

        return promise;
      };
    }

    // Abort all active requests
    if (window._activeAbortControllers) {
      let abortedRequests = 0;
      window._activeAbortControllers.forEach(controller => {
        try {
          controller.abort();
          abortedRequests++;
        } catch (e) {
          console.log('Could not abort request:', e);
        }
      });
      window._activeAbortControllers.clear();
      console.log(`Aborted ${abortedRequests} fetch requests`);
    }
  } catch (error) {
    console.error('Error stopping fetch requests:', error);
  }
}

// Function to stop XMLHttpRequest
function stopXHRRequests() {
  try {
    if (!window._originalXHROpen) {
      window._originalXHROpen = XMLHttpRequest.prototype.open;
      window._activeXHRs = new Set();

      XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        window._activeXHRs.add(this);
        return window._originalXHROpen.call(this, method, url, async, user, password);
      };
    }

    // Abort all active XHR requests
    if (window._activeXHRs) {
      let abortedXHRs = 0;
      window._activeXHRs.forEach(xhr => {
        try {
          if (xhr.readyState !== 4) { // Not completed
            xhr.abort();
            abortedXHRs++;
          }
        } catch (e) {
          console.log('Could not abort XHR:', e);
        }
      });
      window._activeXHRs.clear();
      console.log(`Aborted ${abortedXHRs} XMLHttpRequest calls`);
    }
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

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'stopBackgroundTasks') {
      const result = stopBackgroundTasks();
      sendResponse(result);
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracking);
} else {
  // DOM already loaded, initialize immediately
  initializeTracking();
}

// Also initialize after a short delay to catch any late-loading resources
setTimeout(initializeTracking, 1000);