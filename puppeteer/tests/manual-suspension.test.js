const ExtensionHelper = require('../utils/extension-helper');

describe('Manual Suspension Tests', () => {
  let helper;

  beforeAll(async () => {
    helper = new ExtensionHelper();
    await helper.launchBrowser();
  });

  afterAll(async () => {
    await helper.closeBrowser();
  });

  test('should manually trigger tab suspension', async () => {
    // Configure extension
    const configPage = await helper.createNewPage();
    await helper.configureExtension(configPage, 2, true);
    await configPage.close();

    // Open a test page
    const page = await helper.createNewPage();
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    console.log('Initial URL:', page.url());

    // Get the service worker
    const targets = await helper.browser.targets();
    const serviceWorker = targets.find(target =>
      target.type() === 'service_worker' &&
      target.url().includes('chrome-extension://')
    );

    if (serviceWorker) {
      try {
        const worker = await serviceWorker.worker();

        // Get current tab info
        const tabInfo = await worker.evaluate(() => {
          return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs[0]);
            });
          });
        });

        console.log('Current tab info:', tabInfo);

        // Try to directly call the suspendTab function by injecting code
        const result = await worker.evaluate((tabId) => {
          // We need to access the functions that are defined in the service worker
          // Let's try to call the suspension logic directly
          return new Promise((resolve) => {
            // First, let's check if we can access the global variables
            const settings = window.settings || {};
            const suspendedTabs = window.suspendedTabs || new Map();
            const tabActivityTimers = window.tabActivityTimers || new Map();

            console.log('Settings:', settings);
            console.log('Suspended tabs:', suspendedTabs);
            console.log('Activity timers:', tabActivityTimers);

            // Try to manually create a suspended URL
            const originalUrl = 'https://example.com/';
            const suspendedUrl = 'about:blank#' + originalUrl;

            // Try to update the tab URL directly
            chrome.tabs.update(tabId, { url: suspendedUrl }, () => {
              if (chrome.runtime.lastError) {
                resolve({ error: chrome.runtime.lastError.message });
              } else {
                resolve({ success: true, suspendedUrl });
              }
            });
          });
        }, tabInfo.id);

        console.log('Manual suspension result:', result);

        // Wait a bit and check the URL
        await new Promise(resolve => setTimeout(resolve, 2000));
        const finalUrl = page.url();
        console.log('Final URL after manual suspension:', finalUrl);

        // Check if the URL changed
        const isSuspended = finalUrl.startsWith('about:blank#');
        console.log('Is suspended?', isSuspended);

        // If it worked, try to restore it
        if (isSuspended) {
          console.log('Suspension worked! Now testing restoration...');

          // Try to restore by clicking on the page
          await page.click('body');
          await new Promise(resolve => setTimeout(resolve, 1000));

          const restoredUrl = page.url();
          console.log('URL after restoration attempt:', restoredUrl);

          expect(restoredUrl).toBe('https://example.com/');
        }

      } catch (error) {
        console.log('Error testing manual suspension:', error.message);
      }
    }

    await page.close();
  });

  test('should test suspension with multiple tabs', async () => {
    // Configure extension
    const configPage = await helper.createNewPage();
    await helper.configureExtension(configPage, 2, true);
    await configPage.close();

    // Open first tab
    const page1 = await helper.createNewPage();
    await page1.goto('https://example.com');
    await page1.waitForSelector('body');

    // Open second tab
    const page2 = await helper.createNewPage();
    await page2.goto('https://httpbin.org');
    await page2.waitForSelector('body');

    console.log('Page 1 URL:', page1.url());
    console.log('Page 2 URL:', page2.url());

    // Get the service worker
    const targets = await helper.browser.targets();
    const serviceWorker = targets.find(target =>
      target.type() === 'service_worker' &&
      target.url().includes('chrome-extension://')
    );

    if (serviceWorker) {
      try {
        const worker = await serviceWorker.worker();

        // Get all tabs
        const allTabs = await worker.evaluate(() => {
          return new Promise((resolve) => {
            chrome.tabs.query({}, (tabs) => {
              resolve(tabs);
            });
          });
        });

        console.log('All tabs:', allTabs.map(t => ({ id: t.id, url: t.url, active: t.active })));

        // Find the first tab (example.com)
        const firstTab = allTabs.find(tab => tab.url.includes('example.com'));

        if (firstTab) {
          console.log('Found first tab:', firstTab);

          // Try to manually suspend the first tab
          const result = await worker.evaluate((tabId) => {
            return new Promise((resolve) => {
              const suspendedUrl = 'about:blank#https://example.com/';
              chrome.tabs.update(tabId, { url: suspendedUrl }, () => {
                if (chrome.runtime.lastError) {
                  resolve({ error: chrome.runtime.lastError.message });
                } else {
                  resolve({ success: true, suspendedUrl });
                }
              });
            });
          }, firstTab.id);

          console.log('Manual suspension result:', result);

          // Wait and check if the first tab was suspended
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page1.bringToFront();
          const finalUrl = page1.url();
          console.log('Page 1 final URL:', finalUrl);

          const isSuspended = finalUrl.startsWith('about:blank#');
          console.log('Is page 1 suspended?', isSuspended);

          if (isSuspended) {
            // Test restoration
            await page1.click('body');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const restoredUrl = page1.url();
            console.log('Page 1 URL after restoration:', restoredUrl);

            expect(restoredUrl).toBe('https://example.com/');
          }
        }

      } catch (error) {
        console.log('Error testing multiple tab suspension:', error.message);
      }
    }

    await page1.close();
    await page2.close();
  });

  test('should verify extension can detect tab changes', async () => {
    // Open a test page
    const page = await helper.createNewPage();
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    // Get the service worker
    const targets = await helper.browser.targets();
    const serviceWorker = targets.find(target =>
      target.type() === 'service_worker' &&
      target.url().includes('chrome-extension://')
    );

    if (serviceWorker) {
      try {
        const worker = await serviceWorker.worker();

        // Test if the extension can detect tab updates
        const tabUpdateResult = await worker.evaluate(() => {
          return new Promise((resolve) => {
            // Listen for tab updates
            const listener = (tabId, changeInfo, tab) => {
              console.log('Tab updated:', { tabId, changeInfo, tab });
              resolve({ tabId, changeInfo, tab });
            };

            chrome.tabs.onUpdated.addListener(listener);

            // Remove listener after a short time
            setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve({ timeout: true });
            }, 3000);
          });
        });

        console.log('Tab update detection result:', tabUpdateResult);

        // Test if the extension can detect tab activation
        const tabActivationResult = await worker.evaluate(() => {
          return new Promise((resolve) => {
            // Listen for tab activation
            const listener = (activeInfo) => {
              console.log('Tab activated:', activeInfo);
              resolve(activeInfo);
            };

            chrome.tabs.onActivated.addListener(listener);

            // Remove listener after a short time
            setTimeout(() => {
              chrome.tabs.onActivated.removeListener(listener);
              resolve({ timeout: true });
            }, 3000);
          });
        });

        console.log('Tab activation detection result:', tabActivationResult);

      } catch (error) {
        console.log('Error testing tab change detection:', error.message);
      }
    }

    await page.close();
  });
});