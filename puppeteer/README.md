# Puppeteer Tests for Tab Suspender Extension

This directory contains Puppeteer-based end-to-end tests for the Tab Suspender Chrome extension.

## Overview

Puppeteer tests provide a more robust way to test browser extensions compared to Cypress, as they can:
- Load extensions directly into the browser
- Access extension pages and background scripts
- Test real browser behavior with extensions
- Run in headless mode for CI/CD

## Test Structure

```
puppeteer/
├── tests/
│   ├── working-extension.test.js      # ✅ Working tests (recommended)
│   └── simple-extension.test.js       # ✅ Basic functionality tests
├── utils/
│   └── extension-helper.js            # Helper class for common operations
├── jest.config.js                     # Jest configuration
├── setup.js                          # Jest setup file
└── README.md                         # This file
```

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build:chrome
   ```

### Run All Puppeteer Tests

```bash
npm run test:puppeteer
```

### Run Tests in Watch Mode

```bash
npm run test:puppeteer:watch
```

### Run Tests with Coverage

```bash
npm run test:puppeteer:coverage
```

### Run Specific Test File

```bash
# Run working tests (recommended)
npx jest --config puppeteer/jest.config.js --testPathPattern=working-extension

# Run simple tests
npx jest --config puppeteer/jest.config.js --testPathPattern=simple-extension
```

## Test Features

### ExtensionHelper Class

The `ExtensionHelper` class provides common utilities:

- `launchBrowser()` - Launches Chrome with the extension loaded
- `configureExtension(page, timeout, enabled)` - Configures extension settings
- `waitForTabSuspension(page, originalUrl)` - Waits for tab to be suspended
- `waitForTabRestoration(page, originalUrl)` - Waits for tab to be restored
- `isTabSuspended(page)` - Checks if tab is currently suspended
- `activateTab(page)` - Activates a tab by clicking

### Test Scenarios

1. **Extension Loading** - Verifies extension loads and options page is accessible
2. **Service Worker Functionality** - Tests background script with Chrome API access
3. **Settings Management** - Tests configuration saving and loading
4. **Content Script Injection** - Verifies content scripts are properly injected
5. **Tab Management** - Tests multiple tab creation and management
6. **Extension Configuration** - Tests timeout and enable/disable settings

## Configuration

### Headless Mode

For CI/CD, set `headless: true` in the browser launch options in `extension-helper.js`.

### Timeouts

- Test timeout: 30 seconds (configurable in `jest.config.js`)
- Page load timeout: 5 seconds
- Suspension wait timeout: 10 seconds

### Extension ID

The extension ID is automatically detected from the loaded extension. If you need to use a specific ID, you can modify the `getExtensionId()` method in `extension-helper.js`.

## Debugging

### Visual Debugging

Tests run in non-headless mode by default, so you can see the browser actions. Set `headless: false` in `extension-helper.js`.

### Console Logs

Extension ID and test progress are logged to the console. Uncomment the console suppression in `setup.js` if you want to suppress logs.

### Screenshots

To add screenshots on test failure, add this to your test:

```javascript
afterEach(async () => {
  if (global.testFailed) {
    await page.screenshot({ path: `screenshot-${Date.now()}.png` });
  }
});
```

## Troubleshooting

### Extension Not Loading

1. Ensure the extension is built: `npm run build:chrome`
2. Check the extension path in `extension-helper.js`
3. Verify the manifest.json file exists

### Tests Failing

1. Check if the extension ID is being detected correctly
2. Verify the options page elements exist
3. Increase timeouts if needed
4. Check browser console for errors

### Permission Issues

If you get permission errors, try running with:
```bash
sudo npm run test:puppeteer
```

## Comparison with Cypress

| Feature | Puppeteer | Cypress |
|---------|-----------|---------|
| Extension Loading | ✅ Direct loading | ❌ Manual setup required |
| Extension Pages | ✅ Full access | ❌ Limited access |
| Background Scripts | ✅ Direct access | ❌ No access |
| Headless Mode | ✅ Native support | ✅ Limited support |
| CI/CD Integration | ✅ Excellent | ✅ Good |
| Debugging | ✅ Visual + Console | ✅ Visual + Console |

## Contributing

When adding new tests:

1. Use the `ExtensionHelper` class for common operations
2. Follow the existing test structure
3. Add appropriate timeouts and error handling
4. Test both positive and negative scenarios
5. Include cleanup in `afterEach` hooks