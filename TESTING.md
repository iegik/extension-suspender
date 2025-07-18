# Testing the Tab Suspension Extension

## Quick Test Setup

1. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the extension directory
   - The extension should appear in your extensions list

2. **Configure the extension:**
   - Click on the extension icon in the toolbar
   - Click "Options" to open the settings page
   - Set the inactivity timeout to a short duration (e.g., 30 seconds) for testing
   - Make sure the extension is enabled

## Testing Steps

### Basic Suspension Test

1. **Open the test page:**
   - Open `test.html` in a new tab
   - You should see a timer showing "Time since last activity: 0 seconds"

2. **Switch to another tab:**
   - Open any other website in a new tab
   - Switch to that tab (make sure the test page is not visible)

3. **Wait for suspension:**
   - Wait for the configured timeout period
   - The test page tab should be suspended (URL changes to `about:blank#file:///...`)

4. **Restore the tab:**
   - Switch back to the suspended tab
   - It should automatically restore to the original URL

### Debug Information

- **Check extension logs:** Open Chrome DevTools → Console → Filter by "Extension" to see service worker logs
- **Monitor URL changes:** Use the "Check Current URL" button on the test page
- **View tab info:** Use the "Show Tab Info" button to see detailed tab state

## Expected Behavior

### When a tab becomes inactive:
- The service worker starts an inactivity timer
- After the timeout, the tab URL changes to `about:blank#original-url`
- The original URL is stored for restoration

### When switching back to a suspended tab:
- The service worker detects the tab activation
- The tab URL is restored to the original URL
- The page reloads normally

### Debug Logs to Look For:
```
Tab X became active
Starting inactivity timer for inactive tab Y (URL)
Timer expired for tab Y, attempting suspension...
Starting suspension process for tab Y...
Successfully suspended tab Y: original-url -> about:blank#original-url
```

## Troubleshooting

### Extension not working:
1. Check if the extension is enabled in `chrome://extensions/`
2. Verify the timeout setting in the options page
3. Check the service worker console for errors

### Tabs not suspending:
1. Make sure you're switching away from the tab completely
2. Check that the tab URL is not a special page (chrome://, about:, etc.)
3. Verify the timeout setting is not too long

### Tabs not restoring:
1. Check if the original URL was properly stored
2. Look for errors in the service worker console
3. Try manually navigating back in browser history

## Advanced Testing

### Multiple Tabs:
1. Open several test pages in different tabs
2. Switch between them to test multiple suspensions
3. Verify each tab restores correctly when activated

### Extension Toggle:
1. Disable the extension in options
2. Verify all suspended tabs are restored
3. Re-enable and test suspension again

### Settings Changes:
1. Change the timeout while tabs are running
2. Verify timers are reset with the new timeout
3. Test suspension with different timeout values