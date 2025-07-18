
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

.PHONY: build test clean status help screenshots

test:
	@npm run test

# Generate screenshots for extension store
screenshots:
	@echo "Generating screenshots for extension store..."
	@node generate-screenshots.js

icon:
	@convert -background none -resize 128x128 icon.svg icon.png

# Help
help:
	@echo "Available commands:"
	@echo "  build       - Show instructions for loading extension"
	@echo "  test        - Show testing instructions"
	@echo "  screenshots - Generate screenshots for extension store"
	@echo "  clean       - Clean up generated files"
	@echo "  help        - Show this help message"
