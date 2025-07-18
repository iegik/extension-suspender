const puppeteer = require('puppeteer');
const path = require('path');

class ExtensionHelper {
  constructor() {
    this.browser = null;
    this.extensionId = null;
    this.extensionPath = null;
  }

  async launchBrowser() {
    this.extensionPath = path.resolve(__dirname, '../../');

    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      args: [
        `--disable-extensions-except=${this.extensionPath}`,
        `--load-extension=${this.extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    // Get extension ID
    await this.getExtensionId();
    return this.browser;
  }

  async getExtensionId() {
    const targets = await this.browser.targets();
    const extensionTarget = targets.find(target =>
      target.type() === 'background_page' &&
      target.url().includes('chrome-extension://')
    );

    if (extensionTarget) {
      const url = extensionTarget.url();
      this.extensionId = url.match(/chrome-extension:\/\/([^\/]+)/)[1];
      console.log('Extension ID:', this.extensionId);
      return this.extensionId;
    }

    throw new Error('Extension ID not found');
  }

  async configureExtension(page, timeout = 3, enabled = true) {
    await page.goto(`chrome-extension://${this.extensionId}/options.html`);
    await page.waitForSelector('#timeout', { timeout: 5000 });

    // Set timeout
    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', timeout.toString());

    // Set enabled/disabled
    const enabledCheckbox = await page.$('#enabled');
    const isChecked = await enabledCheckbox.evaluate(el => el.checked);

    if (enabled !== isChecked) {
      await page.click('#enabled');
    }

    // Save settings
    await page.click('#save');

    // Wait for save confirmation
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    }, { timeout: 5000 });
  }

  async waitForTabSuspension(page, originalUrl, timeout = 10000) {
    return page.waitForFunction((url) => {
      return window.location.href.startsWith('about:blank#') &&
             window.location.href.includes(url);
    }, { timeout }, originalUrl);
  }

  async waitForTabRestoration(page, originalUrl, timeout = 10000) {
    return page.waitForFunction((url) => {
      return window.location.href === url;
    }, { timeout }, originalUrl);
  }

  async isTabSuspended(page) {
    const url = page.url();
    return url.startsWith('about:blank#');
  }

  async activateTab(page) {
    await page.click('body');
    await page.waitForTimeout(1000);
  }

  async createNewPage() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    return page;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async closeAllPagesExceptFirst() {
    const pages = await this.browser.pages();
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  }
}

module.exports = ExtensionHelper;