const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

describe('Tab Suspender Extension Tests', () => {
  let browser;
  let extensionId;
  let extensionPath;

  beforeAll(async () => {
    // Set up extension path
    extensionPath = path.resolve(__dirname, '../../');

    // Launch browser with extension
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    // Get extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(target =>
      target.type() === 'background_page' &&
      target.url().includes('chrome-extension://')
    );

    if (extensionTarget) {
      const url = extensionTarget.url();
      extensionId = url.match(/chrome-extension:\/\/([^\/]+)/)[1];
      console.log('Extension ID:', extensionId);
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    // Create a new page for each test
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    // Close all pages except the first one
    const pages = await browser.pages();
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('should load extension and access options page', async () => {
    const page = await browser.newPage();

    // Navigate to extension options page
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // Wait for options page to load
    await page.waitForSelector('#timeout', { timeout: 5000 });

    // Verify options page elements
    const timeoutInput = await page.$('#timeout');
    const enabledCheckbox = await page.$('#enabled');
    const saveButton = await page.$('#save');

    expect(timeoutInput).toBeTruthy();
    expect(enabledCheckbox).toBeTruthy();
    expect(saveButton).toBeTruthy();

    await page.close();
  });

  test('should configure extension timeout', async () => {
    const page = await browser.newPage();

    // Navigate to options page
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#timeout');

    // Set timeout to 3 seconds
    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', '3');

    // Save settings
    await page.click('#save');

    // Verify save confirmation
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    await page.close();
  });

  test('should suspend tab after inactivity timeout', async () => {
    const page = await browser.newPage();

    // Configure extension timeout to 3 seconds
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#timeout');
    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', '3');
    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    // Navigate to a test page
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    // Wait for suspension (more than 3 seconds)
    await page.waitForTimeout(5000);

    // Check if URL has changed to suspended format
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/^about:blank#https:\/\/example\.com/);

    await page.close();
  });

  test('should restore tab when activated', async () => {
    const page = await browser.newPage();

    // Configure extension timeout to 3 seconds
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#timeout');
    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', '3');
    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    // Navigate to test page
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    // Wait for suspension
    await page.waitForTimeout(5000);

    // Verify tab is suspended
    let currentUrl = page.url();
    expect(currentUrl).toMatch(/^about:blank#https:\/\/example\.com/);

    // Activate the tab by clicking
    await page.click('body');

    // Wait for restoration
    await page.waitForTimeout(1000);

    // Verify tab is restored
    currentUrl = page.url();
    expect(currentUrl).toBe('https://example.com/');

    await page.close();
  });

  test('should not suspend active tabs', async () => {
    const page = await browser.newPage();

    // Configure extension timeout to 3 seconds
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#timeout');
    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', '3');
    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    // Navigate to test page
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    // Keep tab active by interacting with it
    await page.click('body');
    await page.waitForTimeout(1000);
    await page.click('body');
    await page.waitForTimeout(1000);
    await page.click('body');
    await page.waitForTimeout(1000);

    // Verify tab is not suspended
    const currentUrl = page.url();
    expect(currentUrl).toBe('https://example.com/');

    await page.close();
  });

  test('should handle multiple tabs correctly', async () => {
    // Configure extension timeout
    const configPage = await browser.newPage();
    await configPage.goto(`chrome-extension://${extensionId}/options.html`);
    await configPage.waitForSelector('#timeout');
    await configPage.click('#timeout');
    await configPage.keyboard.down('Control');
    await configPage.keyboard.press('a');
    await configPage.keyboard.up('Control');
    await configPage.type('#timeout', '3');
    await configPage.click('#save');
    await configPage.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });
    await configPage.close();

    // Open first tab
    const page1 = await browser.newPage();
    await page1.goto('https://example.com');
    await page1.waitForSelector('body');

    // Open second tab
    const page2 = await browser.newPage();
    await page2.goto('https://httpbin.org');
    await page2.waitForSelector('body');

    // Focus on second tab (make first tab inactive)
    await page2.bringToFront();

    // Wait for suspension of first tab
    await page2.waitForTimeout(5000);

    // Check if first tab is suspended
    await page1.bringToFront();
    const currentUrl = page1.url();
    expect(currentUrl).toMatch(/^about:blank#https:\/\/example\.com/);

    await page1.close();
    await page2.close();
  });

  test('should respect extension enable/disable setting', async () => {
    const page = await browser.newPage();

    // Navigate to options page
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#enabled');

    // Disable extension
    await page.click('#enabled');
    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    // Set timeout to 3 seconds
    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', '3');
    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    // Navigate to test page
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    // Wait for 5 seconds
    await page.waitForTimeout(5000);

    // Verify tab is NOT suspended (extension is disabled)
    const currentUrl = page.url();
    expect(currentUrl).toBe('https://example.com/');

    // Re-enable extension
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#enabled');
    await page.click('#enabled');
    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    // Navigate to test page again
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    // Wait for suspension
    await page.waitForTimeout(5000);

    // Verify tab IS suspended (extension is enabled)
    const suspendedUrl = page.url();
    expect(suspendedUrl).toMatch(/^about:blank#https:\/\/example\.com/);

    await page.close();
  });

  test('should not suspend special pages', async () => {
    const page = await browser.newPage();

    // Configure extension timeout
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('#timeout');
    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', '3');
    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    });

    // Navigate to special page
    await page.goto('about:blank');

    // Wait for 5 seconds
    await page.waitForTimeout(5000);

    // Verify special page is not suspended
    const currentUrl = page.url();
    expect(currentUrl).toBe('about:blank');

    await page.close();
  });
});