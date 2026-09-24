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

  console.log('Navigating to /preview...');
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // 1. Dashboard Pulse (Sorted Heatmap)
  await page.screenshot({ path: path.join(artifactDir, 'audit_dashboard_pulse.png') });
  console.log('Saved audit_dashboard_pulse.png');

  // 2. Deals & Migrations
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Deals & Migrations')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'audit_dashboard_deals.png') });
  console.log('Saved audit_dashboard_deals.png');

  // 3. Shareholding & Scans
  for (const b of await page.$$('button')) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Shareholding & Scans')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'audit_dashboard_stakes.png') });
  console.log('Saved audit_dashboard_stakes.png');

  // 4. Mobile header & drawer
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 400));
  const navToggle = await page.$('.nav-toggle');
  if (navToggle) {
    await navToggle.click();
    await new Promise(r => setTimeout(r, 400));
  }
  await page.screenshot({ path: path.join(artifactDir, 'audit_mobile_header_logout.png') });
  console.log('Saved audit_mobile_header_logout.png');

  // 5. Stock Analyzer
  await page.setViewport({ width: 1440, height: 1100 });
  await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 400));

  for (const b of await page.$$('button')) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Stock Analyzer')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));

  // Search TCS or click analyze
  const searchInput = await page.$('input[aria-label="Company name or symbol"]');
  if (searchInput) {
    await searchInput.type('TCS');
    const submitBtn = await page.$('.analyser-search button.primary');
    if (submitBtn) await submitBtn.click();
    await new Promise(r => setTimeout(r, 700));

    for (const b of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Analyze')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  await page.screenshot({ path: path.join(artifactDir, 'audit_stock_analyzer.png') });
  console.log('Saved audit_stock_analyzer.png');

  // Click Financial Results tab
  const resultsTab = await page.$('#results-tab');
  if (resultsTab) {
    await resultsTab.click();
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(artifactDir, 'audit_stock_financials.png') });
    console.log('Saved audit_stock_financials.png');
  }

  // 6. News: Order Wins
  for (const b of await page.$$('button')) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('News')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));

  for (const b of await page.$$('button')) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Order Wins')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'audit_news_orders.png') });
  console.log('Saved audit_news_orders.png');

  await browser.close();
  console.log('All audits captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
