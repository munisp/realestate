/**
 * Capture real screenshots of the live Nigerian Real Estate PWA
 * using Playwright headless Chromium
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

  // Suppress console errors
  page.on('console', msg => {
    if (msg.type() === 'error') return;
  });

  const screenshots = [];

  // ── 1. Home / Landing Page ─────────────────────────────────────────────────
  console.log('Capturing home page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  const home = path.join(OUT_DIR, 'home_page.png');
  await page.screenshot({ path: home, fullPage: false });
  screenshots.push({ name: 'Home Page', file: home });
  console.log('  ✓ Home page captured');

  // ── 2. Property Search / Listings ─────────────────────────────────────────
  console.log('Capturing property search...');
  try {
    await page.goto(`${BASE_URL}/properties`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const search = path.join(OUT_DIR, 'property_search.png');
    await page.screenshot({ path: search, fullPage: false });
    screenshots.push({ name: 'Property Search', file: search });
    console.log('  ✓ Property search captured');
  } catch(e) { console.log('  ✗ Property search failed:', e.message.split('\n')[0]); }

  // ── 3. Map View ────────────────────────────────────────────────────────────
  console.log('Capturing map view...');
  try {
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(3000);
    const map = path.join(OUT_DIR, 'map_view.png');
    await page.screenshot({ path: map, fullPage: false });
    screenshots.push({ name: 'Map View', file: map });
    console.log('  ✓ Map view captured');
  } catch(e) { console.log('  ✗ Map view failed:', e.message.split('\n')[0]); }

  // ── 4. Property Detail ─────────────────────────────────────────────────────
  console.log('Capturing property detail...');
  try {
    await page.goto(`${BASE_URL}/properties/1`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const detail = path.join(OUT_DIR, 'property_detail.png');
    await page.screenshot({ path: detail, fullPage: false });
    screenshots.push({ name: 'Property Detail', file: detail });
    console.log('  ✓ Property detail captured');
  } catch(e) { console.log('  ✗ Property detail failed:', e.message.split('\n')[0]); }

  // ── 5. Valuation Page ─────────────────────────────────────────────────────
  console.log('Capturing valuation page...');
  try {
    await page.goto(`${BASE_URL}/valuation`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const val = path.join(OUT_DIR, 'ai_valuation.png');
    await page.screenshot({ path: val, fullPage: false });
    screenshots.push({ name: 'AI Valuation', file: val });
    console.log('  ✓ Valuation page captured');
  } catch(e) { console.log('  ✗ Valuation failed:', e.message.split('\n')[0]); }

  // ── 6. Dashboard ──────────────────────────────────────────────────────────
  console.log('Capturing dashboard...');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const dash = path.join(OUT_DIR, 'dashboard.png');
    await page.screenshot({ path: dash, fullPage: false });
    screenshots.push({ name: 'Dashboard', file: dash });
    console.log('  ✓ Dashboard captured');
  } catch(e) { console.log('  ✗ Dashboard failed:', e.message.split('\n')[0]); }

  // ── 7. Agent CRM ──────────────────────────────────────────────────────────
  console.log('Capturing agent CRM...');
  try {
    await page.goto(`${BASE_URL}/agent/crm`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const crm = path.join(OUT_DIR, 'agent_crm.png');
    await page.screenshot({ path: crm, fullPage: false });
    screenshots.push({ name: 'Agent CRM', file: crm });
    console.log('  ✓ Agent CRM captured');
  } catch(e) { console.log('  ✗ Agent CRM failed:', e.message.split('\n')[0]); }

  // ── 8. Payments / Escrow ──────────────────────────────────────────────────
  console.log('Capturing payments page...');
  try {
    await page.goto(`${BASE_URL}/payments`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const pay = path.join(OUT_DIR, 'payments_escrow.png');
    await page.screenshot({ path: pay, fullPage: false });
    screenshots.push({ name: 'Payments & Escrow', file: pay });
    console.log('  ✓ Payments page captured');
  } catch(e) { console.log('  ✗ Payments failed:', e.message.split('\n')[0]); }

  // ── 9. Compliance Dashboard ────────────────────────────────────────────────
  console.log('Capturing compliance dashboard...');
  try {
    await page.goto(`${BASE_URL}/admin/compliance`, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const comp = path.join(OUT_DIR, 'compliance_dashboard.png');
    await page.screenshot({ path: comp, fullPage: false });
    screenshots.push({ name: 'Compliance Dashboard', file: comp });
    console.log('  ✓ Compliance dashboard captured');
  } catch(e) { console.log('  ✗ Compliance failed:', e.message.split('\n')[0]); }

  // ── 10. Mobile viewport - Home ────────────────────────────────────────────
  console.log('Capturing mobile view...');
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  try {
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(2500);
    const mob = path.join(OUT_DIR, 'mobile_home.png');
    await mobilePage.screenshot({ path: mob, fullPage: false });
    screenshots.push({ name: 'Mobile Home', file: mob });
    console.log('  ✓ Mobile home captured');
  } catch(e) { console.log('  ✗ Mobile home failed:', e.message.split('\n')[0]); }
  await mobilePage.close();

  await browser.close();

  console.log('\n=== Screenshot Summary ===');
  screenshots.forEach(s => {
    const exists = fs.existsSync(s.file);
    const size = exists ? Math.round(fs.statSync(s.file).size / 1024) : 0;
    console.log(`  ${exists ? '✓' : '✗'} ${s.name}: ${s.file} (${size}KB)`);
  });

  return screenshots;
}

captureScreenshots().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
