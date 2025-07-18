// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Store extension ID globally
let extensionId = null

// Custom command to load the extension and get its ID
Cypress.Commands.add('loadExtension', () => {
  // For Chrome, we need to get the extension ID
  // This assumes the extension is already installed
  cy.window().then((win) => {
    // Try to get extension ID from chrome.runtime
    if (win.chrome && win.chrome.runtime) {
      extensionId = win.chrome.runtime.id
    } else {
      // Fallback: try to get from chrome-extension URLs in the page
      cy.visit('chrome://extensions/')
      cy.get('body').then(($body) => {
        // Look for extension ID in the page content
        const extensionMatch = $body.text().match(/chrome-extension:\/\/([a-z]{32})/i)
        if (extensionMatch) {
          extensionId = extensionMatch[1]
        }
      })
    }
  })

  // Alternative: manually set extension ID if known
  if (!extensionId) {
    // You can set this manually if you know your extension ID
    // extensionId = 'your-extension-id-here'
    cy.log('Extension ID not found. Please set it manually in the loadExtension command.')
  }
})

// Custom command to set extension ID manually
Cypress.Commands.add('setExtensionId', (id) => {
  extensionId = id
  cy.log(`Extension ID set to: ${extensionId}`)
})

// Custom command to get extension ID from Chrome extensions page
Cypress.Commands.add('getExtensionId', () => {
  cy.visit('chrome://extensions/')
  cy.get('body').then(($body) => {
    // Look for extension cards and find our extension
    cy.get('[data-extension-id]').each(($el) => {
      const id = $el.attr('data-extension-id')
      const name = $el.find('.extension-name').text()
      if (name.includes('Tab Suspender')) {
        extensionId = id
        cy.log(`Found extension ID: ${extensionId}`)
      }
    })
  })
})

// Custom command to generate a consistent extension ID based on manifest
Cypress.Commands.add('generateExtensionId', () => {
  // This generates a consistent ID based on the extension name
  // Chrome generates IDs based on the public key, but for testing we can use a hash
  const extensionName = 'Tab Suspender'
  const hash = Array.from(extensionName).reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  const id = Math.abs(hash).toString(16).padStart(32, '0')
  extensionId = id
  cy.log(`Generated extension ID: ${extensionId}`)
})

// Custom command to open extension options
Cypress.Commands.add('openExtensionOptions', () => {
  if (!extensionId) {
    cy.log('Extension ID not available. Please run setExtensionId first.')
    return
  }

  // Open extension options page with actual extension ID
  cy.visit(`chrome-extension://${extensionId}/options.html`)
})

// Custom command to set extension timeout
Cypress.Commands.add('setExtensionTimeout', (seconds) => {
  cy.openExtensionOptions()

  // Set the timeout input
  cy.get('#timeout').clear().type(seconds.toString())

  // The timeout should auto-save, but we can also click save
  cy.get('#save').click()

  // Wait for save confirmation
  cy.get('#status').should('contain', 'Settings saved successfully')
})

// Custom command to wait for tab suspension
Cypress.Commands.add('waitForTabSuspension', (expectedUrl) => {
  // Wait for the URL to change to the suspended version
  cy.url().should('eq', expectedUrl)
})

// Custom command to check if tab is suspended
Cypress.Commands.add('checkTabSuspended', (originalUrl) => {
  const suspendedUrl = `about:blank#${originalUrl}`
  cy.url().should('eq', suspendedUrl)
})

// Custom command to wait for a specific time
Cypress.Commands.add('waitForSeconds', (seconds) => {
  cy.wait(seconds * 1000)
})