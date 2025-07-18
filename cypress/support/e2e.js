// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Custom command to load extension
Cypress.Commands.add('loadExtension', () => {
  // This will be implemented to load the extension
  cy.log('Loading extension...')
})

// Custom command to open extension options
Cypress.Commands.add('openExtensionOptions', () => {
  // This will be implemented to open extension options
  cy.log('Opening extension options...')
})

// Custom command to set extension timeout
Cypress.Commands.add('setExtensionTimeout', (seconds) => {
  // This will be implemented to set the timeout
  cy.log(`Setting extension timeout to ${seconds} seconds...`)
})

// Custom command to wait for tab suspension
Cypress.Commands.add('waitForTabSuspension', (expectedUrl) => {
  // This will be implemented to wait for tab suspension
  cy.log(`Waiting for tab suspension to ${expectedUrl}...`)
})