// Content script to help with tab suspension
// This script runs in the context of web pages to help stop background tasks

// Chrome vs Firefox compatibility
if (typeof chrome !== 'undefined') browser = chrome;

// Function to stop timers and intervals (simple approach)
function stopTimers() {
  try {
    // Clear a reasonable range of timers (most browsers don't have more than a few thousand)
    for (let i = 1; i <= 10000; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    console.log('Cleared timers and intervals');
  } catch (error) {
    console.error('Error stopping timers:', error);
  }
}

// Function to stop requestAnimationFrame (simple approach)
function stopAnimationFrames() {
  try {
    // Cancel a reasonable range of animation frames
    for (let i = 1; i <= 1000; i++) {
      cancelAnimationFrame(i);
    }
    console.log('Cancelled animation frames');
  } catch (error) {
    console.error('Error stopping animation frames:', error);
  }
}

// Main function to stop all background tasks
function stopBackgroundTasks() {
  console.log('Stopping background tasks for tab suspension');

  try {
    stopTimers();
    stopAnimationFrames();
    // Note: Web workers, fetch requests, and XMLHttpRequest will be terminated by page navigation

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