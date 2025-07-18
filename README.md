# Tab Suspender Extension

A browser extension that automatically suspends inactive tabs to save memory and CPU usage. When a tab becomes inactive, it's suspended by navigating to `about:blank#original-url`, which allows you to restore it later using `history.back()`.

## Features

- **Automatic Suspension**: Tabs are automatically suspended after a configurable period of inactivity
- **Memory Savings**: Suspended tabs use minimal memory and CPU resources
- **Easy Restoration**: Click on a suspended tab to automatically restore it
- **Background Task Stopping**: Attempts to stop web workers, timers, and network requests when suspending
- **Configurable**: Adjust inactivity timeout and enable/disable the extension
- **Cross-Browser**: Works with both Chrome and Firefox

## How It Works

1. **Detection**: The extension monitors tab activity and tracks which tabs are active
2. **Suspension**: After the configured inactivity period, inactive tabs are suspended by navigating to `about:blank#original-url`
3. **Restoration**: When you click on a suspended tab, it automatically restores the original URL
4. **Background Tasks**: The extension attempts to stop web workers, timers, and network requests to further reduce resource usage

## Installation

### Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. The extension will appear in your extensions list

### Firefox
1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from this directory

## Usage

1. **Automatic**: The extension works automatically - tabs will be suspended after the configured inactivity period
2. **Manual**: Click the extension icon to manually suspend/restore the current tab
3. **Settings**: Right-click the extension icon and select "Options" to configure:
   - Enable/disable the extension
   - Set inactivity timeout (1-60 minutes)

## Configuration

- **Inactivity Timeout**: How long a tab must be inactive before being suspended (default: 5 minutes)
- **Enabled**: Toggle the extension on/off globally

## Technical Details

### Suspension Method
The extension uses `about:blank#original-url` as the suspension URL. This approach:
- Preserves the original URL in the fragment identifier
- Allows easy restoration via `history.back()`
- Works across all browsers
- Doesn't require special permissions

### Background Task Stopping
When suspending a tab, the extension attempts to:
- Terminate web workers
- Clear timers and intervals
- Cancel animation frames
- Abort network requests
- Stop XMLHttpRequest calls

### Excluded Pages
The extension won't suspend:
- Chrome/Firefox internal pages (`chrome://`, `moz-extension://`)
- About pages (`about:`)
- Data URLs (`data:`)
- File URLs (`file://`)

## Building and Testing

Use the provided Makefile to build the extension:

```bash
# Switch manifest version to Firefox
make firefox

# Switch manifest version to Chrome
make chrome

# Create the extension package
make build

# Sign extension (requires AMO credentials: AMO_JWT_ISSUER, AMO_JWT_SECRET)
make sign
```

### E2E Testing

The project includes Cypress E2E tests to verify the extension functionality:

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific E2E tests
npm run test:e2e

# Open Cypress Test Runner (interactive)
npm run test:open
```

The tests verify:
- Tab suspension after inactivity timeout
- Tab restoration when activated
- Active tab protection
- Special page protection
- Extension settings functionality

See `cypress/README.md` for detailed testing information.

## Files

- `manifest-v2.json` / `manifest-v3.json`: Extension manifests for different browser versions
- `sw.js`: Service worker that handles tab suspension logic
- `content.js`: Content script that stops background tasks
- `options.html/css/js`: Options page for configuration
- `Makefile`: Build and deployment scripts

## Limitations

- Some websites may not work perfectly after restoration due to state loss
- Background task stopping is not 100% effective due to browser security restrictions
- The extension cannot suspend tabs that are actively being used

## License

This project is open source and available under the MIT License.