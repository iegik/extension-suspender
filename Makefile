
# web-ext run --firefox=/Applications/Firefox\ Developer\ Edition.app/Contents/MacOS/firefox-bin --start-url "https://localhost:3000/login"

firefox:
	@rm manifest.json && ln -sf manifest-v2.json manifest.json

chrome:
	@rm manifest.json && ln -sf manifest-v3.json manifest.json


build:
	@web-ext build -a build

sign:
	@web-ext sign --api-key=$AMO_JWT_ISSUER --api-secret=$AMO_JWT_SECRET -a build

# Extension Suspender Makefile

.PHONY: build test clean

# Build the extension (currently just a placeholder since it's all JS)
build:
	@echo "Extension is ready to load in Chrome"
	@echo "1. Open chrome://extensions/"
	@echo "2. Enable Developer mode"
	@echo "3. Click 'Load unpacked' and select this directory"

# Test the extension
test:
	@echo "Testing the extension..."
	@echo "1. Load the extension in Chrome (see 'make build')"
	@echo "2. Open test.html in a new tab"
	@echo "3. Set timeout to 30 seconds in extension options"
	@echo "4. Switch to another tab and wait for suspension"
	@echo "5. Check browser console for debug logs"

# Clean up any generated files
clean:
	@echo "Cleaning up..."
	@rm -f *.log
	@echo "Clean complete"

# Show extension status
status:
	@echo "Extension files:"
	@ls -la *.js *.json *.html 2>/dev/null || echo "No extension files found"
	@echo ""
	@echo "Test files:"
	@ls -la test.html TESTING.md 2>/dev/null || echo "No test files found"

# Help
help:
	@echo "Available commands:"
	@echo "  build  - Show instructions for loading extension"
	@echo "  test   - Show testing instructions"
	@echo "  clean  - Clean up generated files"
	@echo "  status - Show extension file status"
	@echo "  help   - Show this help message"