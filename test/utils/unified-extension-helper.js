const puppeteer = require('puppeteer');
const path = require('path');

// Unified ExtensionHelper that works with both Cypress and Puppeteer
class UnifiedExtensionHelper {
  constructor(framework = 'puppeteer') {
    this.framework = framework;
    this.browser = null;
    this.extensionId = null;
    this.extensionPath = null;
    this.currentPage = null; // Track the current page for Puppeteer
  }

  // Framework detection
  isCypress() {
    return typeof Cypress !== 'undefined';
  }

  isPuppeteer() {
    return typeof require !== 'undefined' && typeof require('puppeteer') === 'object';
  }

  // Browser management
  async launchBrowser() {
    if (this.isCypress()) {
      // Cypress handles browser launch
      return;
    }

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

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async getExtensionId() {
    if (this.isCypress()) {
      // Cypress handles extension ID differently
      return;
    }

    // Wait a bit for the extension to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    const targets = await this.browser.targets();
    console.log('Available targets:', targets.map(t => ({ type: t.type(), url: t.url() })));

    // Look for background page or service worker
    const extensionTarget = targets.find(target =>
      (target.type() === 'background_page' || target.type() === 'service_worker') &&
      target.url().includes('chrome-extension://')
    );

    if (extensionTarget) {
      const url = extensionTarget.url();
      const match = url.match(/chrome-extension:\/\/([^\/]+)/);
      if (match) {
        this.extensionId = match[1];
        console.log('Extension ID:', this.extensionId);
        return this.extensionId;
      }
    }

    // Fallback: try to get from extension management page
    try {
      const page = await this.browser.newPage();
      await page.goto('chrome://extensions/');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Look for our extension in the page
      const extensionId = await page.evaluate(() => {
        const extensionCards = document.querySelectorAll('[data-extension-id]');
        for (const card of extensionCards) {
          const name = card.querySelector('.extension-name')?.textContent;
          if (name && name.includes('Tab Suspender')) {
            return card.getAttribute('data-extension-id');
          }
        }
        return null;
      });

      if (extensionId) {
        this.extensionId = extensionId;
        console.log('Extension ID found from extensions page:', this.extensionId);
        await page.close();
        return this.extensionId;
      }

      await page.close();
    } catch (error) {
      console.log('Could not get extension ID from extensions page:', error.message);
    }

    // Last resort: generate a consistent ID for testing
    console.log('Extension ID not found, using generated ID for testing');
    this.extensionId = 'abcdefghijklmnopqrstuvwxyz123456';
    return this.extensionId;
  }

  // Common API methods that work across frameworks
  async configureExtension(timeout = 3, enabled = true) {
    if (this.isCypress()) {
      return this.configureExtensionCypress(timeout, enabled);
    } else {
      return this.configureExtensionPuppeteer(timeout, enabled);
    }
  }

  async waitForTabSuspension(originalUrl, timeout = 10000) {
    if (this.isCypress()) {
      return this.waitForTabSuspensionCypress(originalUrl, timeout);
    } else {
      return this.waitForTabSuspensionPuppeteer(originalUrl, timeout);
    }
  }

  async waitForTabRestoration(originalUrl, timeout = 10000) {
    if (this.isCypress()) {
      return this.waitForTabRestorationCypress(originalUrl, timeout);
    } else {
      return this.waitForTabRestorationPuppeteer(originalUrl, timeout);
    }
  }

  async isTabSuspended() {
    if (this.isCypress()) {
      return this.isTabSuspendedCypress();
    } else {
      return this.isTabSuspendedPuppeteer();
    }
  }

  async activateTab() {
    if (this.isCypress()) {
      return this.activateTabCypress();
    } else {
      return this.activateTabPuppeteer();
    }
  }

  async createNewPage() {
    if (this.isCypress()) {
      // Cypress handles page management
      return null;
    } else {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      return page;
    }
  }

  // Framework-specific implementations
  async configureExtensionCypress(timeout, enabled) {
    cy.openExtensionOptions();
    cy.get('#timeout').clear().type(timeout.toString());

    if (enabled) {
      cy.get('#enabled').check();
    } else {
      cy.get('#enabled').uncheck();
    }

    cy.get('#save').click();
    cy.get('#status').should('contain', 'Settings saved successfully');
  }

  async configureExtensionPuppeteer(timeout, enabled) {
    const page = await this.browser.newPage();
    await page.goto(`chrome-extension://${this.extensionId}/options.html`);
    await page.waitForSelector('#timeout', { timeout: 5000 });

    await page.click('#timeout');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('#timeout', timeout.toString());

    const enabledCheckbox = await page.$('#enabled');
    const isChecked = await enabledCheckbox.evaluate(el => el.checked);

    if (enabled !== isChecked) {
      await page.click('#enabled');
    }

    await page.click('#save');
    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('Settings saved successfully');
    }, { timeout: 5000 });

    await page.close();
  }

  async waitForTabSuspensionCypress(originalUrl, timeout) {
    const suspendedUrl = `about:blank#${originalUrl}`;
    cy.url().should('eq', suspendedUrl, { timeout });
  }

  async waitForTabSuspensionPuppeteer(originalUrl, timeout) {
    if (!this.currentPage) {
      throw new Error('No current page available for suspension check');
    }
    return this.currentPage.waitForFunction((url) => {
      return window.location.href.startsWith('about:blank#') &&
             window.location.href.includes(url);
    }, { timeout }, originalUrl);
  }

  async waitForTabRestorationCypress(originalUrl, timeout) {
    cy.url().should('eq', originalUrl, { timeout });
  }

  async waitForTabRestorationPuppeteer(originalUrl, timeout) {
    if (!this.currentPage) {
      throw new Error('No current page available for restoration check');
    }
    return this.currentPage.waitForFunction((url) => {
      return window.location.href === url;
    }, { timeout }, originalUrl);
  }

  async isTabSuspendedCypress() {
    return new Promise((resolve) => {
      cy.url().then((url) => {
        resolve(url.startsWith('about:blank#'));
      });
    });
  }

  async isTabSuspendedPuppeteer() {
    if (!this.currentPage) {
      return false;
    }
    const url = this.currentPage.url();
    return url.startsWith('about:blank#');
  }

  async activateTabCypress() {
    cy.get('body').click();
    cy.wait(1000);
  }

  async activateTabPuppeteer() {
    if (this.currentPage) {
      await this.currentPage.click('body');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async visitPage(url) {
    if (this.isCypress()) {
      cy.visit(url);
    } else {
      this.currentPage = await this.browser.newPage();
      await this.currentPage.goto(url);
      await this.currentPage.waitForSelector('body');
      return this.currentPage;
    }
  }

  async waitForSeconds(seconds) {
    if (this.isCypress()) {
      cy.wait(seconds * 1000);
    } else {
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
  }

  async getCurrentUrl() {
    if (this.isCypress()) {
      return new Promise((resolve) => {
        cy.url().then((url) => resolve(url));
      });
    } else {
      return this.currentPage ? this.currentPage.url() : null;
    }
  }

  async closeAllPagesExceptFirst() {
    if (this.isCypress()) {
      // Cypress handles page management
      return;
    } else {
      const pages = await this.browser.pages();
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    }
  }
}

module.exports = UnifiedExtensionHelper;