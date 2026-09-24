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
  await page.setViewport({ width: 1440, height: 1200 });

  console.log('Navigating to /preview...');
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 500));

  // Navigate to Stock Analyzer
  for (const b of await page.$$('button')) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Stock Analyzer')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));

  // Search TCS
  const searchInput = await page.$('input[aria-label="Company name or symbol"]');
  if (searchInput) {
    await searchInput.type('TCS');
    const submitBtn = await page.$('.analyser-search button.primary');
    if (submitBtn) await submitBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Find the Analyze button inside search-results
    const resultButtons = await page.$$('.search-results button');
    if (resultButtons.length > 0) {
      await resultButtons[0].click();
      console.log('Clicked Analyze for TCS, waiting for fundamentals...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Take screenshot of top section with Scorecard Matrix
  await page.screenshot({ path: path.join(artifactDir, 'audit_stock_scorecard_matrix.png') });
  console.log('Saved audit_stock_scorecard_matrix.png');

  // Scroll down to Valuation section
  await page.evaluate(() => {
    window.scrollBy(0, 1100);
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'audit_stock_valuation_cmp.png') });
  console.log('Saved audit_stock_valuation_cmp.png');

  // Click Financial Results tab
  for (const b of await page.$$('button')) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Annual & Quarterly Results')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'audit_stock_financials_tab.png') });
  console.log('Saved audit_stock_financials_tab.png');

  // Test mobile header topbar logout button
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'audit_mobile_topbar_logout_fixed.png') });
  console.log('Saved audit_mobile_topbar_logout_fixed.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
