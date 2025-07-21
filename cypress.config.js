const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('before:browser:launch', (browser = {}, launchOptions) => {
        // Load the extension
        launchOptions.extensions.push(__dirname)

        return launchOptions
      })
    },
    baseUrl: 'https://example.com/',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'test/cypress-entry.js', // Use unified entry point
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 60000,
  },
  chromeWebSecurity: false,
})