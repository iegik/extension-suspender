
# web-ext run --firefox=/Applications/Firefox\ Developer\ Edition.app/Contents/MacOS/firefox-bin --start-url "https://localhost:3000/login"

firefox:
	@rm manifest.json && ln -sf manifest-v2.json manifest.json

chrome:
	@rm manifest.json && ln -sf manifest-v3.json manifest.json


build:
	@web-ext build -a build

sign:
	@web-ext sign --api-key=$AMO_JWT_ISSUER --api-secret=$AMO_JWT_SECRET -a build