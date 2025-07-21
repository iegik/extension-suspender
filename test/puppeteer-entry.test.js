// Puppeteer-specific entry point
const UnifiedExtensionHelper = require('./utils/unified-extension-helper');

// Set up Jest environment
beforeAll(async () => {
  global.helper = new UnifiedExtensionHelper('puppeteer');
  await global.helper.launchBrowser();
});

afterAll(async () => {
  await global.helper.closeBrowser();
});

// Make helper available globally for tests
global.helper = global.helper;

// Simple test to verify the structure works
describe('Unified Test Structure', () => {
  test('should create helper instance', () => {
    expect(global.helper).toBeDefined();
    expect(global.helper.isPuppeteer()).toBe(true);
    expect(global.helper.isCypress()).toBe(false);
  });

  test('should have extension ID', () => {
    expect(global.helper.extensionId).toBeDefined();
  });
});

// Import unified tests
require('./unified/tab-suspender.test.js');