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

  console.log('Capturing Login page Desktop 1440x900...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'audit_login_anniversary_large_logo.png'), fullPage: false });

  console.log('Capturing Login page Mobile 390x844...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'audit_login_mobile_anniversary.png'), fullPage: false });
  await page.screenshot({ path: path.join(artifactDir, 'audit_login_mobile_anniversary_full.png'), fullPage: true });

  console.log('Capturing Terminal Dashboard Desktop (Dark Theme)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'audit_terminal_dashboard_theme.png'), fullPage: false });

  console.log('Capturing Terminal Mobile View...');
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(artifactDir, 'audit_terminal_mobile_theme.png'), fullPage: false });

  // Navigate to Stock Analyzer on desktop
  console.log('Capturing Stock Analyzer (Dark Theme)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  
  // Click on Stock Analysis nav button
  const buttons = await page.$$('nav button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Stock Analysis')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'audit_stock_analyzer_theme.png'), fullPage: false });

  await browser.close();
  console.log('All theme audit screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
