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
  await page.setViewport({ width: 1440, height: 950 });

  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });

  // Switch to dark mode
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Dark')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 400));

  // Scroll down to the movers section
  await page.evaluate(() => window.scrollBy(0, 520));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'page_movers_compact_dark.png'), fullPage: false });

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
