import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = 'C:\\Users\\acer\\.gemini\\antigravity\\brain\\348a389e-d925-4be8-9eb2-17d220614da4';

async function clickNav(page, name) {
  const buttons = await page.$$('button.nav-item');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes(name)) {
      await b.click();
      await new Promise(r => setTimeout(r, 600));
      return true;
    }
  }
  return false;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to /preview...');
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });

  // 1. Stock Analyzer
  console.log('Clicking Stock Analyzer...');
  await clickNav(page, 'Stock Analyzer');
  await page.screenshot({ path: path.join(artifactDir, 'view_dark_analyzer.png'), fullPage: false });

  // 2. Watchlist
  console.log('Clicking Watchlist...');
  await clickNav(page, 'Watchlist');
  await page.screenshot({ path: path.join(artifactDir, 'view_dark_watchlist.png'), fullPage: false });

  // 3. News
  console.log('Clicking News...');
  await clickNav(page, 'News');
  await page.screenshot({ path: path.join(artifactDir, 'view_dark_news.png'), fullPage: false });

  // 4. Swing Trade
  console.log('Clicking Swing Trade...');
  await clickNav(page, 'Swing Trade');
  await page.screenshot({ path: path.join(artifactDir, 'view_dark_swing.png'), fullPage: false });

  // 5. About Us
  console.log('Clicking About Us...');
  await clickNav(page, 'About Us');
  await page.screenshot({ path: path.join(artifactDir, 'view_dark_about.png'), fullPage: false });

  await browser.close();
  console.log('All tab views captured successfully in dark theme!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
