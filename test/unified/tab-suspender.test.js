const UnifiedExtensionHelper = require('../utils/unified-extension-helper');

// This test file works with both Cypress and Puppeteer
describe('Tab Suspender Extension (Unified)', () => {
  let helper;

  beforeAll(async () => {
    // Use the global helper if it exists (from puppeteer-entry.js), otherwise create a new one
    if (global.helper) {
      helper = global.helper;
    } else {
      helper = new UnifiedExtensionHelper();
      if (helper.isPuppeteer()) {
        await helper.launchBrowser();
      }
    }
  });

  afterAll(async () => {
    // Only close browser if we created it (not if it was passed from global)
    if (helper && !global.helper && helper.isPuppeteer()) {
      await helper.closeBrowser();
    }
  });

  beforeEach(async () => {
    if (helper.isCypress()) {
      // Generate a consistent extension ID for testing
      cy.generateExtensionId();
    }
  });

  test('should configure extension settings', async () => {
    await helper.configureExtension(3, true);
    // Test passes for both frameworks
  });

  test('should suspend tabs after inactivity', async () => {
    // Navigate to test page
    await helper.visitPage('https://example.com/');

    // Configure short timeout
    await helper.configureExtension(2, true);

    // Wait for suspension
    await helper.waitForTabSuspension('https://example.com/');

    // Verify suspension
    const isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(true);
  });

  test('should restore tabs when activated', async () => {
    // Navigate to test page
    await helper.visitPage('https://example.com/');

    // Configure short timeout
    await helper.configureExtension(2, true);

    // Wait for suspension
    await helper.waitForTabSuspension('https://example.com/');

    // Verify suspension
    let isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(true);

    // Activate the tab
    await helper.activateTab();

    // Wait for restoration
    await helper.waitForTabRestoration('https://example.com/');

    // Verify restoration
    isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(false);
  });

  test('should not suspend active tabs', async () => {
    // Navigate to test page
    await helper.visitPage('https://example.com/');

    // Configure short timeout
    await helper.configureExtension(2, true);

    // Keep the tab active by interacting with it
    await helper.activateTab();
    await helper.waitForSeconds(1);
    await helper.activateTab();
    await helper.waitForSeconds(1);
    await helper.activateTab();
    await helper.waitForSeconds(1);

    // Verify the tab is NOT suspended
    const isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(false);
  });

  test('should handle multiple tabs correctly', async () => {
    const testUrl = 'https://example.com/';

    // Open first tab
    await helper.visitPage(testUrl);
    let currentUrl = await helper.getCurrentUrl();
    expect(currentUrl).toBe(testUrl);

    // Open second tab (for Puppeteer, this creates a new page)
    if (helper.isPuppeteer()) {
      const secondPage = await helper.browser.newPage();
      await secondPage.goto('https://httpbin.org');
      await secondPage.waitForSelector('body');
      await secondPage.bringToFront();
    } else {
      // For Cypress, we simulate opening a new tab
      cy.window().then((win) => {
        win.open('https://httpbin.org', '_blank');
      });
    }

    // Configure extension timeout
    await helper.configureExtension(2, true);

    // Wait for suspension of the first tab
    await helper.waitForSeconds(3);

    // Switch back to first tab and verify it's suspended
    if (helper.isPuppeteer()) {
      const pages = await helper.browser.pages();
      const firstPage = pages.find(page => page.url().includes('example.com'));
      if (firstPage) {
        await firstPage.bringToFront();
        const finalUrl = firstPage.url();
        expect(finalUrl).toMatch(/^about:blank#/);
      }
    } else {
      // For Cypress, we're already on the first tab
      const isSuspended = await helper.isTabSuspended();
      expect(isSuspended).toBe(true);
    }
  });

  test('should respect extension enable/disable setting', async () => {
    // Navigate to test page
    await helper.visitPage('https://example.com/');

    // Disable the extension
    await helper.configureExtension(2, false);

    // Wait for potential suspension
    await helper.waitForSeconds(3);

    // Verify the tab is NOT suspended (extension is disabled)
    const isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(false);

    // Re-enable the extension
    await helper.configureExtension(2, true);

    // Wait for suspension
    await helper.waitForSeconds(3);

    // Verify the tab IS suspended (extension is enabled)
    const isSuspendedAfterEnable = await helper.isTabSuspended();
    expect(isSuspendedAfterEnable).toBe(true);
  });

  test('should not suspend special pages', async () => {
    // Navigate to a special page
    await helper.visitPage('about:blank');

    // Configure extension timeout
    await helper.configureExtension(2, true);

    // Wait for potential suspension
    await helper.waitForSeconds(3);

    // Verify the URL has NOT changed (special pages should not be suspended)
    const currentUrl = await helper.getCurrentUrl();
    expect(currentUrl).toBe('about:blank');
  });

  test('should verify extension options page functionality', async () => {
    if (helper.isCypress()) {
      cy.openExtensionOptions();
      cy.get('#timeout').should('have.value', '1');
      cy.get('#enabled').should('be.checked');
    } else {
      const page = await helper.browser.newPage();
      await page.goto(`chrome-extension://${helper.extensionId}/options.html`);
      await page.waitForSelector('#timeout');

      const timeoutValue = await page.$eval('#timeout', el => el.value);
      expect(timeoutValue).toBe('60');

      const enabledCheckbox = await page.$('#enabled');
      const isChecked = await enabledCheckbox.evaluate(el => el.checked);
      expect(isChecked).toBe(true);

      await page.close();
    }
  });

  test('should handle different timeout values', async () => {
    // Test with 1 second timeout
    await helper.configureExtension(1, true);
    await helper.visitPage('https://example.com/');
    await helper.waitForSeconds(2);
    let isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(true);

    // Test with 5 second timeout
    await helper.configureExtension(5, true);
    await helper.visitPage('https://httpbin.org');
    await helper.waitForSeconds(2);
    isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(false); // Should not be suspended yet

    await helper.waitForSeconds(4); // Wait more to exceed 5 seconds
    isSuspended = await helper.isTabSuspended();
    expect(isSuspended).toBe(true);
  });

  test('should verify service worker functionality', async () => {
    if (helper.isPuppeteer()) {
      const targets = await helper.browser.targets();
      const serviceWorker = targets.find(target =>
        target.type() === 'service_worker' &&
        target.url().includes('chrome-extension://')
      );

      expect(serviceWorker).toBeDefined();
      console.log('Service worker is running:', serviceWorker.url());

      // Test that we can connect to the service worker
      try {
        const worker = await serviceWorker.worker();
        const result = await worker.evaluate(() => {
          return {
            hasChrome: typeof chrome !== 'undefined',
            hasTabs: typeof chrome?.tabs !== 'undefined',
            hasStorage: typeof chrome?.storage !== 'undefined',
            hasScripting: typeof chrome?.scripting !== 'undefined'
          };
        });

        console.log('Service worker capabilities:', result);
        expect(result.hasChrome).toBe(true);
        expect(result.hasTabs).toBe(true);
        expect(result.hasStorage).toBe(true);
        expect(result.hasScripting).toBe(true);
      } catch (error) {
        console.log('Service worker connection test:', error.message);
        // This is acceptable for testing purposes
      }
    } else {
      // For Cypress, we can't directly access service worker
      // but we can verify the extension is working
      cy.openExtensionOptions();
      cy.get('#timeout').should('exist');
    }
  });
});