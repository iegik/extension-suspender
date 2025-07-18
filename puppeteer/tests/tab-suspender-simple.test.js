const ExtensionHelper = require('../utils/extension-helper');

describe('Tab Suspender Extension - Simple Tests', () => {
  let helper;

  beforeAll(async () => {
    helper = new ExtensionHelper();
    await helper.launchBrowser();
  });

  afterAll(async () => {
    await helper.closeBrowser();
  });

  afterEach(async () => {
    await helper.closeAllPagesExceptFirst();
  });

  test('should load extension and access options page', async () => {
    const page = await helper.createNewPage();

    // Navigate to extension options page
    await page.goto(`chrome-extension://${helper.extensionId}/options.html`);

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

  test('should suspend tab after inactivity timeout', async () => {
    const page = await helper.createNewPage();

    // Configure extension timeout to 3 seconds
    await helper.configureExtension(page, 3, true);

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
    const page = await helper.createNewPage();
    const testUrl = 'https://example.com';

    // Configure extension timeout to 3 seconds
    await helper.configureExtension(page, 3, true);

    // Navigate to test page
    await page.goto(testUrl);
    await page.waitForSelector('body');

    // Wait for suspension
    await page.waitForTimeout(5000);

    // Verify tab is suspended
    let currentUrl = page.url();
    expect(currentUrl).toMatch(/^about:blank#https:\/\/example\.com/);

    // Activate the tab by clicking
    await helper.activateTab(page);

    // Wait for restoration
    await page.waitForTimeout(1000);

    // Verify tab is restored
    currentUrl = page.url();
    expect(currentUrl).toBe('https://example.com/');

    await page.close();
  });

  test('should not suspend active tabs', async () => {
    const page = await helper.createNewPage();

    // Configure extension timeout to 3 seconds
    await helper.configureExtension(page, 3, true);

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
    const configPage = await helper.createNewPage();
    await helper.configureExtension(configPage, 3, true);
    await configPage.close();

    // Open first tab
    const page1 = await helper.createNewPage();
    await page1.goto('https://example.com');
    await page1.waitForSelector('body');

    // Open second tab
    const page2 = await helper.createNewPage();
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
    const page = await helper.createNewPage();

    // Disable extension
    await helper.configureExtension(page, 3, false);

    // Navigate to test page
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    // Wait for 5 seconds
    await page.waitForTimeout(5000);

    // Verify tab is NOT suspended (extension is disabled)
    const currentUrl = page.url();
    expect(currentUrl).toBe('https://example.com/');

    // Re-enable extension
    await helper.configureExtension(page, 3, true);

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
    const page = await helper.createNewPage();

    // Configure extension timeout
    await helper.configureExtension(page, 3, true);

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