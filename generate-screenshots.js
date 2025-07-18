const puppeteer = require('puppeteer');
const path = require('path');

async function generateScreenshots() {
  console.log('Starting screenshot generation...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Load the options page
    const optionsPath = path.join(__dirname, 'options.html');
    await page.goto(`file://${optionsPath}`);

    // Wait for the page to load completely
    await page.waitForSelector('.container');

    // Set some default values for a better screenshot
    await page.evaluate(() => {
      // Set enabled checkbox to true
      document.getElementById('enabled').checked = true;
      // Set timeout to 5 minutes
      document.getElementById('timeout').value = '5';
    });

    // Generate screenshots at different sizes
    const screenshots = [
      { name: 'options-1280x800.png', width: 1280, height: 800 },
      { name: 'options-640x400.png', width: 640, height: 400 },
      { name: 'small-promo-440x280.png', width: 440, height: 280 },
      { name: 'marquee-promo-1400x560.png', width: 1400, height: 560 }
    ];

    for (const screenshot of screenshots) {
      console.log(`Generating ${screenshot.name}...`);

      await page.setViewport({
        width: screenshot.width,
        height: screenshot.height,
        deviceScaleFactor: 2 // Higher resolution for better quality
      });

      // Wait a bit for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      await page.screenshot({
        path: screenshot.name,
        fullPage: false,
        type: 'png'
      });

      console.log(`✓ Generated ${screenshot.name}`);
    }

    console.log('\nAll screenshots generated successfully!');
    console.log('Files created:');
    screenshots.forEach(s => console.log(`  - ${s.name}`));

  } catch (error) {
    console.error('Error generating screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
generateScreenshots().catch(console.error);