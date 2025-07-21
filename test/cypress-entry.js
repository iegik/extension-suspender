// Cypress-specific entry point
const UnifiedExtensionHelper = require('./utils/unified-extension-helper');

// Create a global helper instance for Cypress
const helper = new UnifiedExtensionHelper('cypress');

// Override Cypress commands to use unified helper
Cypress.Commands.add('configureExtension', (timeout, enabled) => {
  return helper.configureExtension(timeout, enabled);
});

Cypress.Commands.add('waitForTabSuspension', (originalUrl, timeout) => {
  return helper.waitForTabSuspension(originalUrl, timeout);
});

Cypress.Commands.add('waitForTabRestoration', (originalUrl, timeout) => {
  return helper.waitForTabRestoration(originalUrl, timeout);
});

Cypress.Commands.add('isTabSuspended', () => {
  return helper.isTabSuspended();
});

Cypress.Commands.add('activateTab', () => {
  return helper.activateTab();
});

Cypress.Commands.add('visitPage', (url) => {
  return helper.visitPage(url);
});

Cypress.Commands.add('waitForSeconds', (seconds) => {
  return helper.waitForSeconds(seconds);
});

Cypress.Commands.add('getCurrentUrl', () => {
  return helper.getCurrentUrl();
});

// Make helper available globally for tests
window.helper = helper;

// Import unified tests
require('./unified/tab-suspender.test.js');