/**
 * Final QA screenshot capture script.
 * - Authenticates via dev login endpoint
 * - Uses correct routes (no wrong IDs)
 * - Waits for network idle + extra delay for charts/data to render
 * - Captures 14 key screenshots for the presentation
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5000';
const SS_DIR = '/home/ubuntu/realestate_slides_project/images/real_screenshots';
fs.mkdirSync(SS_DIR, { recursive: true });

async function login(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/dev/login`, {
    data: { userId: 1 },
    headers: { 'Content-Type': 'application/json' }
  });
  const cookies = res.headers()['set-cookie'];
  if (cookies) {
    const match = cookies.match(/app_session_id=([^;]+)/);
    if (match) {
      await context.addCookies([{
        name: 'app_session_id',
        value: match[1],
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false
      }]);
      console.log('✅ Authenticated');
    }
  }
  await page.close();
}

async function capture(page, url, filename, waitFor, extraDelay = 3000) {
  const outPath = path.join(SS_DIR, filename);
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait for a specific element if provided
    if (waitFor) {
      try {
        await page.waitForSelector(waitFor, { timeout: 8000 });
      } catch(e) {
        console.log(`  ⚠️  Selector "${waitFor}" not found on ${url}, continuing...`);
      }
    }
    // Extra delay for charts and dynamic content to render
    await page.waitForTimeout(extraDelay);
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = fs.statSync(outPath);
    console.log(`  ✅ ${filename} (${Math.round(stat.size/1024)}KB)`);
  } catch(e) {
    console.log(`  ❌ ${filename} FAILED: ${e.message}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5
  });

  await login(context);
  const page = await context.newPage();

  console.log('\n📸 Capturing screenshots...\n');

  // 1. Home page — hero section
  await capture(page, '/', 'home_page.png', 'h1', 2000);

  // 2. Properties search — with listings loaded
  await capture(page, '/properties', 'properties_search.png', '.property-card, [class*="property"], [class*="listing"]', 4000);

  // 3. Market Trends Dashboard — charts loaded
  await capture(page, '/market-trends', 'market_trends.png', 'canvas, [class*="chart"], h1', 5000);

  // 4. User Dashboard — with seeded favorites/transactions
  await capture(page, '/dashboard', 'dashboard.png', 'h1, h2', 3000);

  // 5. Agent Performance — correct route (no ID)
  await capture(page, '/agent/performance', 'agent_performance.png', 'h1, h2, canvas', 5000);

  // 6. Land Registry — with seeded records
  await capture(page, '/land-registry', 'land_registry.png', 'h1, table, [class*="record"]', 4000);

  // 7. Admin Verification Dashboard
  await capture(page, '/admin/verification', 'admin_verification.png', 'h1, h2, table', 4000);

  // 8. AI Assistant — chat interface
  await capture(page, '/ai-assistant', 'ai_assistant.png', 'h1, textarea, input[type="text"]', 3000);

  // 9. Pricing/Smart Pricing Dashboard — with shortlet properties seeded
  await capture(page, '/pricing/dashboard', 'pricing_dashboard.png', 'h1, h2, canvas', 5000);

  // 10. Investment Dashboard
  await capture(page, '/investment-dashboard', 'investment_dashboard.png', 'h1, h2, canvas', 5000);

  // 11. Neighbourhood / Map view
  await capture(page, '/map', 'map_advanced.png', 'canvas, [class*="map"]', 5000);

  // 12. Mobile view — resize to mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, '/', 'mobile_view.png', 'h1', 2000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 13. Builders marketplace
  await capture(page, '/builders', 'builders_marketplace.png', 'h1, h2', 3000);

  // 14. Neighbourhood analytics
  await capture(page, '/neighbourhood', 'neighborhood_lagos.png', 'h1, h2', 3000);

  await browser.close();
  console.log('\n✅ All screenshots captured.\n');
})();
