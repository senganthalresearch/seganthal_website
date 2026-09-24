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

  // Click Dark button
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Dark')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(artifactDir, 'page_dark_dashboard.png'), fullPage: false });

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
