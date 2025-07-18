# Testing the Tab Suspension Extension

## Quick Setup

1. **Load the extension:**
   - Chrome: `chrome://extensions/` → Developer mode → Load unpacked
   - Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → Select `manifest-v2.json`

2. **Configure for testing:**
   - Click extension icon → Options
   - Set timeout to 30 seconds for quick testing
   - Ensure extension is enabled

## Testing Steps

### Basic Suspension Test

1. **Open test page:**
   - Open `test.html` in a new tab
   - You should see a timer showing "Time since last activity: 0 seconds"

2. **Switch to another tab:**
   - Open any other website in a new tab
   - Switch to that tab (make sure test page is not visible)

3. **Wait for suspension:**
   - Wait for the configured timeout period
   - The test page tab should be suspended (URL changes to `about:blank#file:///...`)

4. **Restore the tab:**
   - Switch back to the suspended tab
   - It should automatically restore to the original URL

### Debug Information

- **Check extension logs:** Open Chrome DevTools → Console → Filter by "Extension"
- **Monitor URL changes:** Use the "Check Current URL" button on test page
- **View tab info:** Use the "Show Tab Info" button to see detailed tab state

## Expected Behavior

### When a tab becomes inactive:
- Service worker starts an inactivity timer
- After timeout, tab URL changes to `about:blank#original-url`
- Original URL is stored for restoration

### When switching back to a suspended tab:
- Service worker detects tab activation
- Tab URL is restored to original URL
- Page reloads normally

## Troubleshooting

### Extension not working:
1. Check if extension is enabled in `chrome://extensions/`
2. Verify timeout setting in options page
3. Check service worker console for errors

### Tabs not suspending:
1. Make sure you're switching away from tabs completely
2. Check that tab URLs are not special pages (chrome://, about:, etc.)
3. Verify timeout setting is not too long

### Tabs not restoring:
1. Check if original URL was properly stored
2. Look for errors in service worker console
3. Try manually navigating back in browser history

## Advanced Testing

### Multiple Tabs:
1. Open several test pages in different tabs
2. Switch between them to test multiple suspensions
3. Verify each tab restores correctly when activated

### Extension Toggle:
1. Disable extension in options
2. Verify all suspended tabs are restored
3. Re-enable and test suspension again

### Settings Changes:
1. Change timeout while tabs are running
2. Verify timers reset with new timeout
3. Test suspension with different timeout values