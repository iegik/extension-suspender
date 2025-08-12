
# web-ext run --firefox=/Applications/Firefox\ Developer\ Edition.app/Contents/MacOS/firefox-bin --start-url "https://localhost:3000/login"

firefox:
	@rm manifest.json && ln -sf manifest-v2.json manifest.json

chrome:
	@rm manifest.json && ln -sf manifest-v3.json manifest.json

build\:chrome:
	@web-ext build -a build -n "`jq -r .name package.json`-v`jq -r .version package.json`.zip"

build\:firefox:
	@web-ext build -a build -n "`jq -r .name package.json`-v`jq -r .version package.json`.xpi"

build:
	@make chrome build:chrome && make firefox build:firefox

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

export PATH := /Applications/Inkscape.app/Contents/MacOS:$(PATH)

icon:
	@echo "Making icons..." \
	&& for i in 16 32 48 128 256 512; do \
		src=favicon-x1.svg; \
		[ $${i} -ge 256 ] && src=favicon-x2.svg; \
		inkscape \
			-w $${i} -h $${i} \
			--export-type=png --export-filename=favicon-$${i}.png --export-dpi=200 \
			--export-background-opacity=0 $$src; \
	done \
	&& magick favicon-*.png -background white -alpha remove favicon.ico \
	&& echo "done"

# 		magick convert \
# 			-density 200 -transparent white -channel rgba -background white -antialias \
# 			-resize $${i}x$${i} \
# 			$$src favicon-$${i}.png; \

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
