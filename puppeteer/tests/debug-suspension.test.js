const ExtensionHelper = require('../utils/extension-helper');

describe('Debug Suspension Tests', () => {
  let helper;

  beforeAll(async () => {
    helper = new ExtensionHelper();
    await helper.launchBrowser();
  });

  afterAll(async () => {
    await helper.closeBrowser();
  });

  test('should debug extension service worker state', async () => {
    // Get the service worker
    const targets = await helper.browser.targets();
    const serviceWorker = targets.find(target =>
      target.type() === 'service_worker' &&
      target.url().includes('chrome-extension://')
    );

    if (serviceWorker) {
      try {
        const worker = await serviceWorker.worker();

        // Check the current state of the service worker
        const state = await worker.evaluate(() => {
          return {
            settings: {
              inactivityTimeout: window.settings?.inactivityTimeout || 'Not found',
              enabled: window.settings?.enabled || 'Not found'
            },
            suspendedTabs: window.suspendedTabs ? Array.from(window.suspendedTabs.entries()) : 'Not found',
            tabActivityTimers: window.tabActivityTimers ? Array.from(window.tabActivityTimers.keys()) : 'Not found'
          };
        });

        console.log('Service Worker State:', JSON.stringify(state, null, 2));

        // Check if the extension is properly configured
        expect(state.settings.enabled).toBe(true);
        expect(state.settings.inactivityTimeout).toBeGreaterThan(0);

      } catch (error) {
        console.log('Could not access service worker state:', error.message);
      }
    }
  });

  test('should test direct suspension via service worker', async () => {
    // Configure extension with short timeout
    const configPage = await helper.createNewPage();
    await helper.configureExtension(configPage, 2, true); // 2 seconds
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

        // Get the tab ID
        const tabId = await page.evaluate(() => {
          return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs[0]?.id);
            });
          });
        });

        console.log('Current tab ID:', tabId);

        // Try to manually trigger suspension
        const result = await worker.evaluate((tabId) => {
          // Access the suspendTab function
          if (typeof window.suspendTab === 'function') {
            return window.suspendTab(tabId);
          } else {
            return 'suspendTab function not found';
          }
        }, tabId);

        console.log('Manual suspension result:', result);

        // Wait a bit and check the URL
        await new Promise(resolve => setTimeout(resolve, 2000));
        const finalUrl = page.url();
        console.log('Final URL after manual suspension:', finalUrl);

      } catch (error) {
        console.log('Error testing manual suspension:', error.message);
      }
    }

    await page.close();
  });

  test('should test tab query functionality', async () => {
    // Open multiple tabs
    const page1 = await helper.createNewPage();
    await page1.goto('https://example.com');
    await page1.waitForSelector('body');

    const page2 = await helper.createNewPage();
    await page2.goto('https://httpbin.org');
    await page2.waitForSelector('body');

    // Get the service worker
    const targets = await helper.browser.targets();
    const serviceWorker = targets.find(target =>
      target.type() === 'service_worker' &&
      target.url().includes('chrome-extension://')
    );

    if (serviceWorker) {
      try {
        const worker = await serviceWorker.worker();

        // Test tab querying
        const tabsInfo = await worker.evaluate(() => {
          return new Promise((resolve) => {
            chrome.tabs.query({}, (tabs) => {
              resolve(tabs.map(tab => ({
                id: tab.id,
                url: tab.url,
                active: tab.active,
                title: tab.title
              })));
            });
          });
        });

        console.log('All tabs:', tabsInfo);

        // Test active tab query
        const activeTabs = await worker.evaluate(() => {
          return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs.map(tab => ({
                id: tab.id,
                url: tab.url,
                active: tab.active
              })));
            });
          });
        });

        console.log('Active tabs:', activeTabs);

        // Switch focus and check again
        await page2.bringToFront();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const activeTabsAfterSwitch = await worker.evaluate(() => {
          return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs.map(tab => ({
                id: tab.id,
                url: tab.url,
                active: tab.active
              })));
            });
          });
        });

        console.log('Active tabs after switch:', activeTabsAfterSwitch);

      } catch (error) {
        console.log('Error testing tab queries:', error.message);
      }
    }

    await page1.close();
    await page2.close();
  });

  test('should test extension event listeners', async () => {
    // Configure extension
    const configPage = await helper.createNewPage();
    await helper.configureExtension(configPage, 3, true);
    await configPage.close();

    // Open a test page
    const page = await helper.createNewPage();
    await page.goto('https://example.com');
    await page.waitForSelector('body');

    console.log('Page loaded:', page.url());

    // Create another tab to make the first inactive
    const otherPage = await helper.createNewPage();
    await otherPage.goto('https://httpbin.org');
    await otherPage.waitForSelector('body');

    // Switch focus
    await otherPage.bringToFront();
    console.log('Switched focus to other tab');

    // Wait and check if suspension occurred
    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.bringToFront();
    const finalUrl = page.url();
    console.log('Final URL after 5 seconds:', finalUrl);

    // Check if suspended
    const isSuspended = finalUrl.startsWith('about:blank#');
    console.log('Is suspended?', isSuspended);

    // If not suspended, let's check the service worker state
    if (!isSuspended) {
      const targets = await helper.browser.targets();
      const serviceWorker = targets.find(target =>
        target.type() === 'service_worker' &&
        target.url().includes('chrome-extension://')
      );

      if (serviceWorker) {
        try {
          const worker = await serviceWorker.worker();

          const state = await worker.evaluate(() => {
            return {
              settings: {
                inactivityTimeout: window.settings?.inactivityTimeout || 'Not found',
                enabled: window.settings?.enabled || 'Not found'
              },
              suspendedTabs: window.suspendedTabs ? Array.from(window.suspendedTabs.entries()) : 'Not found',
              tabActivityTimers: window.tabActivityTimers ? Array.from(window.tabActivityTimers.keys()) : 'Not found'
            };
          });

          console.log('Service Worker State when not suspended:', JSON.stringify(state, null, 2));
        } catch (error) {
          console.log('Could not access service worker state:', error.message);
        }
      }
    }

    await page.close();
    await otherPage.close();
  });
});