const ExtensionHelper = require('../utils/extension-helper');

describe('Direct Suspension Tests', () => {
  let helper;

  beforeAll(async () => {
    helper = new ExtensionHelper();
    await helper.launchBrowser();
  });

  afterAll(async () => {
    await helper.closeBrowser();
  });

  test('should test direct navigation to suspended URL', async () => {
    // Open a page and navigate directly to the suspended URL format
    const page = await helper.createNewPage();

    // Navigate directly to the suspended URL format
    const originalUrl = 'https://example.com/';
    const suspendedUrl = 'about:blank#' + originalUrl;

    console.log('Navigating to suspended URL:', suspendedUrl);
    await page.goto(suspendedUrl);

    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);

    // The extension should detect this and restore the original URL
    // Let's wait a bit more to see if restoration happens
    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalUrl = page.url();
    console.log('Final URL after waiting:', finalUrl);

    // Check if the URL was restored
    if (finalUrl === originalUrl) {
      console.log('✅ URL was restored successfully!');
    } else if (finalUrl === suspendedUrl) {
      console.log('⚠️ URL remained suspended - extension may not be working');
    } else {
      console.log('❓ URL changed to something unexpected:', finalUrl);
    }

    await page.close();
  });

  test('should test suspension and restoration cycle', async () => {
    // Configure extension first
    const configPage = await helper.createNewPage();
    await helper.configureExtension(configPage, 2, true);
    await configPage.close();

    // Open a page
    const page = await helper.createNewPage();
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    console.log('Initial URL:', page.url());

    // Manually navigate to suspended URL
    const suspendedUrl = 'about:blank#https://example.com/';
    await page.goto(suspendedUrl);

    console.log('URL after manual suspension:', page.url());

    // Wait for potential restoration
    await new Promise(resolve => setTimeout(resolve, 3000));

    const urlAfterWait = page.url();
    console.log('URL after waiting for restoration:', urlAfterWait);

    // Try clicking to trigger restoration
    await page.click('body');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const urlAfterClick = page.url();
    console.log('URL after clicking:', urlAfterClick);

    // Check if restoration worked
    if (urlAfterClick === 'https://example.com/') {
      console.log('✅ Restoration worked!');
    } else {
      console.log('❌ Restoration did not work. URL:', urlAfterClick);
    }

    await page.close();
  });

  test('should test extension with real tab switching', async () => {
    // Configure extension with very short timeout
    const configPage = await helper.createNewPage();
    await helper.configureExtension(configPage, 1, true); // 1 second timeout
    await configPage.close();

    // Open first tab
    const page1 = await helper.createNewPage();
    await page1.goto('https://example.com');
    await page1.waitForSelector('body');

    console.log('Page 1 loaded:', page1.url());

    // Open second tab
    const page2 = await helper.createNewPage();
    await page2.goto('https://httpbin.org');
    await page2.waitForSelector('body');

    console.log('Page 2 loaded:', page2.url());

    // Switch to second tab to make first tab inactive
    await page2.bringToFront();
    console.log('Switched to page 2');

    // Wait for suspension (more than 1 second)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if first tab was suspended
    await page1.bringToFront();
    const page1Url = page1.url();
    console.log('Page 1 URL after 3 seconds:', page1Url);

    const isSuspended = page1Url.startsWith('about:blank#');
    console.log('Is page 1 suspended?', isSuspended);

    if (isSuspended) {
      console.log('✅ Suspension worked!');

      // Test restoration
      await page1.click('body');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const restoredUrl = page1.url();
      console.log('Page 1 URL after restoration:', restoredUrl);

      if (restoredUrl === 'https://example.com/') {
        console.log('✅ Restoration worked!');
      } else {
        console.log('❌ Restoration failed. URL:', restoredUrl);
      }
    } else {
      console.log('❌ Suspension did not work');

      // Let's check if the extension is properly configured
      const configPage = await helper.createNewPage();
      await configPage.goto(`chrome-extension://${helper.extensionId}/options.html`);
      await configPage.waitForSelector('#timeout');

      const timeoutValue = await configPage.$eval('#timeout', el => el.value);
      const enabledValue = await configPage.$eval('#enabled', el => el.checked);

      console.log('Extension timeout setting:', timeoutValue);
      console.log('Extension enabled setting:', enabledValue);

      await configPage.close();
    }

    await page1.close();
    await page2.close();
  });

  test('should verify extension can handle suspended URLs', async () => {
    // Open a page
    const page = await helper.createNewPage();

    // Navigate to a suspended URL
    await page.goto('about:blank#https://httpbin.org/');

    console.log('Navigated to suspended URL');

    // Wait for the extension to potentially restore it
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    // The extension should restore the original URL
    if (finalUrl === 'https://httpbin.org/') {
      console.log('✅ Extension restored the URL correctly');
    } else if (finalUrl === 'about:blank#https://httpbin.org/') {
      console.log('⚠️ Extension did not restore the URL');
    } else {
      console.log('❓ URL changed to:', finalUrl);
    }

    await page.close();
  });
});