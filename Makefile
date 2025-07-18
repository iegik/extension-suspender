
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
	@echo "Optimizing PNG files with optipng..."
	@optipng -o2 *.png
	@echo "✓ Screenshots generated and optimized"

icon:
	@magick convert -background white -resize 128x128 icon.svg icon.png

# Help
help:
	@echo "Available commands:"
	@echo "  firefox     - Switch to Firefox manifest"
	@echo "  chrome      - Switch to Chrome manifest"
	@echo "  build       - Build extension with web-ext"
	@echo "  sign        - Sign extension for AMO"
	@echo "  test        - Run tests"
	@echo "  screenshots - Generate screenshots for extension store"
	@echo "  icon        - Generate icon.png from icon.svg"
	@echo "  help        - Show this help message"
