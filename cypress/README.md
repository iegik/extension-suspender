# Tab Suspender Extension - Cypress E2E Tests

This directory contains end-to-end tests for the Tab Suspender browser extension using Cypress.

## Test Overview

The tests verify the core functionality of the tab suspender extension:

1. **Tab Suspension**: Tabs should be suspended after the configured inactivity timeout
2. **Tab Restoration**: Suspended tabs should be restored when activated
3. **Active Tab Protection**: Active tabs should not be suspended
4. **Special Page Protection**: Special pages (chrome://, about:, etc.) should not be suspended
5. **Extension Settings**: The extension should respect enable/disable settings

## Test Scenarios

### Main Test: `tab-suspender.cy.js`
This test covers the complete workflow:
- Open a web page (example.com)
- Configure extension timeout to 3 seconds
- Wait for 5 seconds (inactivity)
- Verify URL changes to `about:blank#https://example.com/`

### Simulation Test: `tab-suspender-simulation.cy.js`
This test demonstrates the expected behavior without requiring the extension to be loaded:
- Simulates the extension behavior
- Shows what should happen in a real scenario
- Useful for understanding the expected functionality

## Running the Tests

### Prerequisites
1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Cypress:
   ```bash
   npx cypress install
   ```

### Running Tests

#### Run all tests:
```bash
npm test
```

#### Run specific test file:
```bash
npm run test:e2e
```

#### Open Cypress Test Runner (interactive):
```bash
npm run test:open
```

## Manual Testing

Since browser extensions require special setup in Cypress, you can also test manually:

1. **Load the extension**:
   - Chrome: Go to `chrome://extensions/`, enable Developer mode, click "Load unpacked"
   - Firefox: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on"

2. **Configure the extension**:
   - Right-click the extension icon
   - Select "Options"
   - Set "Inactivity Timeout" to 3 seconds
   - Save settings

3. **Test the functionality**:
   - Open `https://example.com/`
   - Wait 5 seconds without interacting
   - Verify the URL changes to `about:blank#https://example.com/`
   - Click on the tab to restore it

## Test Structure

```
cypress/
├── e2e/
│   ├── tab-suspender.cy.js          # Main E2E tests
│   └── tab-suspender-simulation.cy.js # Simulation tests
├── support/
│   ├── commands.js                   # Custom Cypress commands
│   └── e2e.js                       # Support file
└── README.md                        # This file
```

## Custom Commands

The tests use several custom commands:

- `cy.loadExtension()`: Load the extension (placeholder)
- `cy.openExtensionOptions()`: Open extension options page
- `cy.setExtensionTimeout(seconds)`: Set the inactivity timeout
- `cy.checkTabSuspended(originalUrl)`: Verify tab is suspended
- `cy.waitForSeconds(seconds)`: Wait for a specific time

## Notes

- **Browser Extension Limitations**: Cypress has limitations when testing browser extensions. The tests include both realistic scenarios and simulation tests.
- **Manual Testing**: For complete verification, manual testing with the extension loaded is recommended.
- **Real Extension Testing**: To test with the actual extension, you would need to:
  1. Load the extension in the browser
  2. Use Cypress to interact with web pages
  3. Monitor URL changes and tab behavior

## Expected Behavior

When the extension is working correctly:

1. **Inactive tabs** should be suspended after the timeout period
2. **Active tabs** should remain unsuspended
3. **Suspended tabs** should restore when clicked
4. **Special pages** should never be suspended
5. **Extension settings** should be respected

The URL format for suspended tabs is: `about:blank#original-url`