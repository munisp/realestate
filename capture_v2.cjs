/**
 * Capture real screenshots of the live Nigerian Real Estate PWA v2
 * Waits for content to fully load before capturing
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = '/home/ubuntu/realestate_slides_project/images/real_screenshots';

fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function capture(page, filename, label) {
  const filepath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  const size = Math.round(fs.statSync(filepath).size / 1024);
  console.log(`  ✓ ${label}: ${filepath} (${size}KB)`);
  return filepath;
}

async function captureScreenshots() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() !== 'error') return; });

  // ── 1. Home Page ──────────────────────────────────────────────────────────
  console.log('\n[1] Home Page');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  await capture(page, 'home_page.png', 'Home Page');

  // ── 2. Properties Page (with data) ────────────────────────────────────────
  console.log('\n[2] Properties Page');
  await page.goto(`${BASE_URL}/properties`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(4000);
  // Wait for property cards to appear
  try {
    await page.waitForSelector('[class*="card"], [class*="property"], [class*="listing"]', { timeout: 5000 });
  } catch(e) {}
  await sleep(1000);
  await capture(page, 'property_search.png', 'Property Search');

  // ── 3. Map View ────────────────────────────────────────────────────────────
  console.log('\n[3] Map View');
  await page.goto(`${BASE_URL}/map`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(4000);
  await capture(page, 'map_view.png', 'Map View');

  // ── 4. Property Detail (ID 1 - Lekki Duplex) ──────────────────────────────
  console.log('\n[4] Property Detail');
  await page.goto(`${BASE_URL}/properties/1`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(page, 'property_detail.png', 'Property Detail');

  // ── 5. AI Valuation ────────────────────────────────────────────────────────
  console.log('\n[5] AI Valuation');
  await page.goto(`${BASE_URL}/valuation`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(page, 'ai_valuation.png', 'AI Valuation');

  // ── 6. Dashboard ──────────────────────────────────────────────────────────
  console.log('\n[6] Dashboard');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(page, 'dashboard.png', 'Dashboard');

  // ── 7. Market Trends ──────────────────────────────────────────────────────
  console.log('\n[7] Market Trends');
  await page.goto(`${BASE_URL}/market-trends`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(page, 'market_trends.png', 'Market Trends');

  // ── 8. Registry / Verified ────────────────────────────────────────────────
  console.log('\n[8] Registry');
  await page.goto(`${BASE_URL}/registry`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(page, 'registry.png', 'Registry');

  // ── 9. For You (Personalized) ─────────────────────────────────────────────
  console.log('\n[9] For You');
  await page.goto(`${BASE_URL}/for-you`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(page, 'for_you.png', 'For You');

  // ── 10. Mobile Home ───────────────────────────────────────────────────────
  console.log('\n[10] Mobile View');
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(mobilePage, 'mobile_home.png', 'Mobile Home');

  // ── 11. Mobile Properties ─────────────────────────────────────────────────
  console.log('\n[11] Mobile Properties');
  await mobilePage.goto(`${BASE_URL}/properties`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  await capture(mobilePage, 'mobile_properties.png', 'Mobile Properties');
  await mobilePage.close();

  await browser.close();
  console.log('\n=== All screenshots captured ===');
}

captureScreenshots().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
