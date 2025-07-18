describe('Tab Suspender Extension', () => {
  beforeEach(() => {
    // Generate a consistent extension ID for testing
    // In a real scenario, you would use the actual extension ID from Chrome
    cy.generateExtensionId()
  })

  it('should open extension options', () => {
    cy.openExtensionOptions()
    cy.get('#timeout').should('have.value', '1')
  })

  xit('should suspend tabs after inactivity timeout', () => {
    // Step 1: Open a web page
    cy.visit('https://example.com/')

    // Verify we're on the correct page
    cy.url().should('eq', 'https://example.com/')

    // Step 2: Configure the extension timeout to 3 seconds
    cy.setExtensionTimeout(3)

    // Step 3: Wait for 5 seconds (more than the 3-second timeout)
    cy.waitForSeconds(5)

    // Step 4: Verify the URL has changed to the suspended version
    cy.checkTabSuspended('https://example.com/')
  })

  xit('should restore tabs when activated', () => {
    // Step 1: Open a web page
    cy.visit('https://example.com/')

    // Step 2: Configure the extension timeout to 3 seconds
    cy.setExtensionTimeout(3)

    // Step 3: Wait for suspension
    cy.waitForSeconds(5)

    // Step 4: Verify tab is suspended
    cy.checkTabSuspended('https://example.com/')

    // Step 5: Activate the tab (simulate clicking on it)
    cy.get('body').click()

    // Step 6: Verify the tab is restored to the original URL
    cy.url().should('eq', 'https://example.com/')
  })

  xit('should not suspend active tabs', () => {
    // Step 1: Open a web page
    cy.visit('https://example.com/')

    // Step 2: Configure the extension timeout to 3 seconds
    cy.setExtensionTimeout(3)

    // Step 3: Keep the tab active by interacting with it
    cy.get('body').click()
    cy.wait(1000)
    cy.get('body').click()
    cy.wait(1000)
    cy.get('body').click()
    cy.wait(1000)

    // Step 4: Verify the URL has NOT changed (tab should not be suspended)
    cy.url().should('eq', 'https://example.com/')
  })

  xit('should handle multiple tabs correctly', () => {
    const testUrl = 'https://example.com/'

    // Step 1: Open first tab
    cy.visit(testUrl)
    cy.url().should('eq', testUrl)

    // Step 2: Open second tab with the same URL
    cy.window().then((win) => {
      win.open(testUrl, '_blank')
    })

    // Step 3: Configure extension timeout
    cy.setExtensionTimeout(3)

    // Step 4: Focus on the second tab (last opened)
    cy.window().then((win) => {
      // Get all windows and focus on the last one (second tab)
      const windows = win.opener ? [win.opener, win] : [win]
      const lastWindow = windows[windows.length - 1]
      lastWindow.focus()
    })

    // Step 5: Wait for suspension of the first tab
    cy.waitForSeconds(5)

    // Step 6: Switch back to first tab and verify it's suspended
    cy.window().then((win) => {
      // Get all windows and focus on the first one
      const windows = win.opener ? [win.opener, win] : [win]
      const firstWindow = windows[0]
      firstWindow.focus()
    })

    // Step 7: Verify first tab is suspended
    cy.checkTabSuspended(testUrl)
  })

  xit('should respect extension enable/disable setting', () => {
    // Step 1: Open a web page
    cy.visit('https://example.com/')

    // Step 2: Disable the extension
    cy.openExtensionOptions()
    cy.get('#enabled').uncheck()
    cy.get('#save').click()
    cy.get('#status').should('contain', 'Settings saved successfully')

    // Step 3: Set timeout to 3 seconds
    cy.setExtensionTimeout(3)

    // Step 4: Wait for 5 seconds
    cy.waitForSeconds(5)

    // Step 5: Verify the URL has NOT changed (extension is disabled)
    cy.url().should('eq', 'https://example.com/')

    // Step 6: Re-enable the extension
    cy.openExtensionOptions()
    cy.get('#enabled').check()
    cy.get('#save').click()
    cy.get('#status').should('contain', 'Settings saved successfully')

    // Step 7: Wait for suspension
    cy.waitForSeconds(5)

    // Step 8: Verify the URL has changed (extension is enabled)
    cy.checkTabSuspended('https://example.com/')
  })

  xit('should not suspend special pages', () => {
    // Step 1: Open a special page (chrome:// or about:)
    cy.visit('about:blank')

    // Step 2: Configure extension timeout
    cy.setExtensionTimeout(3)

    // Step 3: Wait for 5 seconds
    cy.waitForSeconds(5)

    // Step 4: Verify the URL has NOT changed (special pages should not be suspended)
    cy.url().should('eq', 'about:blank')
  })
})