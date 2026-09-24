import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = 'C:\\Users\\acer\\.gemini\\antigravity\\brain\\348a389e-d925-4be8-9eb2-17d220614da4';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });

  // Scroll down to find the TCS mover button and click it
  await page.evaluate(() => window.scrollBy(0, 800));
  await new Promise(r => setTimeout(r, 400));

  const moverButtons = await page.$$('.mover-row');
  if (moverButtons.length > 0) {
    console.log('Clicking TCS mover button...');
    await moverButtons[0].click();
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(artifactDir, 'page_analyzed_tcs.png'), fullPage: false });
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
