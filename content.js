// Content script to help with tab suspension
// This script runs in the context of web pages to help stop background tasks

// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// Function to stop web workers
function stopWebWorkers() {
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
    window._activeWorkers.forEach(worker => {
      try {
        worker.terminate();
      } catch (e) {
        console.log('Could not terminate worker:', e);
      }
    });
    window._activeWorkers.clear();
  }
}

// Function to stop timers and intervals
function stopTimers() {
  // Clear all timeouts and intervals
  const highestId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
}

// Function to stop requestAnimationFrame
function stopAnimationFrames() {
  if (window._animationFrameIds) {
    window._animationFrameIds.forEach(id => {
      cancelAnimationFrame(id);
    });
    window._animationFrameIds.clear();
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
}

// Function to stop fetch requests
function stopFetchRequests() {
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
    window._activeAbortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        console.log('Could not abort request:', e);
      }
    });
    window._activeAbortControllers.clear();
  }
}

// Function to stop XMLHttpRequest
function stopXHRRequests() {
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
    window._activeXHRs.forEach(xhr => {
      try {
        if (xhr.readyState !== 4) { // Not completed
          xhr.abort();
        }
      } catch (e) {
        console.log('Could not abort XHR:', e);
      }
    });
    window._activeXHRs.clear();
  }
}

// Main function to stop all background tasks
function stopBackgroundTasks() {
  console.log('Stopping background tasks for tab suspension');

  stopWebWorkers();
  stopTimers();
  stopAnimationFrames();
  stopFetchRequests();
  stopXHRRequests();

  // Clear any remaining event listeners (be careful with this)
  // This is a more aggressive approach and might break some pages
  // const oldAddEventListener = EventTarget.prototype.addEventListener;
  // EventTarget.prototype.addEventListener = function() {
  //   // Don't add new listeners during suspension
  // };
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'stopBackgroundTasks') {
    stopBackgroundTasks();
    sendResponse({ success: true });
  }
});

// Initialize tracking on page load
document.addEventListener('DOMContentLoaded', () => {
  // Set up tracking for new resources
  stopWebWorkers();
  stopAnimationFrames();
  stopFetchRequests();
  stopXHRRequests();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize tracking
  });
} else {
  // DOM already loaded, initialize immediately
  stopWebWorkers();
  stopAnimationFrames();
  stopFetchRequests();
  stopXHRRequests();
}