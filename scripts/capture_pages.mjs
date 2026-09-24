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

  console.log('Capturing /login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'page_login.png'), fullPage: false });

  console.log('Capturing /preview (Dashboard)...');
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'page_dashboard.png'), fullPage: false });

  console.log('Capturing mobile view...');
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(artifactDir, 'page_dashboard_mobile.png'), fullPage: false });

  await browser.close();
  console.log('Screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
