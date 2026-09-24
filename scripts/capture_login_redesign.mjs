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

  console.log('Capturing Desktop 1440x900...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'login_redesign_1440x900.png'), fullPage: false });

  console.log('Capturing Desktop 1920x1080...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'login_redesign_1920x1080.png'), fullPage: false });

  console.log('Capturing Mobile 390x844...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'login_redesign_mobile.png'), fullPage: false });
  await page.screenshot({ path: path.join(artifactDir, 'login_redesign_mobile_full.png'), fullPage: true });

  await browser.close();
  console.log('All login redesign screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
