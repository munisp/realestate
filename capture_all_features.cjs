/**
 * Comprehensive feature screenshot capture script
 * Captures all major platform features for the presentation
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/home/ubuntu/realestate_slides_project/images/real_screenshots';

async function getToken() {
  return new Promise((resolve) => {
    const data = JSON.stringify({ openId: 'oauth-admin-001' });
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/dev/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let cookie = '';
      const setCookie = res.headers['set-cookie'];
      if (setCookie) { const m = setCookie[0].match(/app_session_id=([^;]+)/); if (m) cookie = m[1]; }
      res.resume(); res.on('end', () => resolve(cookie));
    });
    req.write(data); req.end();
  });
}

const PAGES = [
  // === GEOSPATIAL & MAP FEATURES ===
  { url: '/map/advanced', file: 'advanced_map.png', label: 'Advanced Geospatial Map', wait: 5000 },
  { url: '/lagos-neighborhoods', file: 'lagos_neighborhoods.png', label: 'Lagos Neighbourhood Explorer', wait: 5000 },
  { url: '/neighborhoods/compare-gnn', file: 'neighborhood_gnn.png', label: 'Neighbourhood GNN Comparison', wait: 5000 },
  { url: '/shortlet/map', file: 'shortlet_map.png', label: 'Shortlet Map View', wait: 5000 },

  // === AI & ML FEATURES ===
  { url: '/ai-assistant', file: 'ai_assistant.png', label: 'AI Assistant', wait: 4000 },
  { url: '/smart-recommendations', file: 'smart_recommendations.png', label: 'Smart AI Recommendations', wait: 4000 },
  { url: '/ml-training', file: 'ml_training.png', label: 'ML Training Dashboard', wait: 5000 },
  { url: '/gnn-test', file: 'gnn_test.png', label: 'GNN Market Analysis', wait: 5000 },

  // === VIRTUAL TOURS & AR ===
  { url: '/virtual-tours/manage', file: 'virtual_tour_manage.png', label: 'Virtual Tour Management', wait: 4000 },
  { url: '/property/1/ar', file: 'ar_property.png', label: 'AR Property View', wait: 4000 },
  { url: '/property/1/staging', file: 'virtual_staging.png', label: 'AI Virtual Staging', wait: 4000 },

  // === INVESTMENT & FINANCE ===
  { url: '/investment-calculator', file: 'investment_calculator.png', label: 'Investment Calculator', wait: 4000 },
  { url: '/market-intelligence', file: 'market_intelligence.png', label: 'Market Intelligence', wait: 5000 },

  // === BLOCKCHAIN & TRUST ===
  { url: '/blockchain-registry', file: 'blockchain_registry.png', label: 'Blockchain Registry', wait: 4000 },

  // === BUILDER & DEVELOPER ===
  { url: '/builders', file: 'builder_marketplace.png', label: 'Builder Marketplace', wait: 4000 },
  { url: '/builder/dashboard', file: 'builder_dashboard.png', label: 'Builder Dashboard', wait: 4000 },

  // === PROPERTY SEARCH ===
  { url: '/properties', file: 'property_search.png', label: 'Property Search', wait: 5000 },
  { url: '/property/1', file: 'property_detail.png', label: 'Property Detail', wait: 4000 },
  { url: '/property/1/valuation', file: 'property_valuation.png', label: 'AI Property Valuation', wait: 4000 },

  // === SHORTLET ===
  { url: '/shortlet', file: 'shortlet_search.png', label: 'Shortlet Search', wait: 4000 },

  // === ADMIN & COMPLIANCE ===
  { url: '/admin/verification', file: 'admin_verification.png', label: 'Admin Verification Dashboard', wait: 4000 },
  { url: '/admin/competitor-analytics', file: 'competitor_analytics.png', label: 'Competitor Analytics', wait: 4000 },
];

(async () => {
  const token = await getToken();
  console.log('Got session token, launching browser...');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5
  });

  await ctx.addCookies([{
    name: 'app_session_id', value: token,
    domain: 'localhost', path: '/',
    httpOnly: false, secure: false, sameSite: 'Lax'
  }]);

  const page = await ctx.newPage();
  let successCount = 0;
  let failCount = 0;

  for (const p of PAGES) {
    try {
      console.log(`\nCapturing: ${p.label} (${p.url})`);
      await page.goto('http://localhost:5000' + p.url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(p.wait || 3000);

      // Check for actual 404 page (not just the number in JS)
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || '');
      if (bodyText.includes('Page Not Found') || bodyText.includes('404 - ')) {
        console.log(`  ⚠️  SKIPPED (404 page): ${p.file}`);
        failCount++;
        continue;
      }

      const outPath = path.join(SCREENSHOT_DIR, p.file);
      await page.screenshot({ path: outPath, fullPage: false });
      const { size } = fs.statSync(outPath);
      console.log(`  ✅ ${p.file} — ${Math.round(size / 1024)}KB`);
      successCount++;
    } catch (err) {
      console.log(`  ❌ FAILED (${err.message.substring(0, 60)}): ${p.file}`);
      failCount++;
    }
  }

  await browser.close();
  console.log(`\n=== DONE: ${successCount} captured, ${failCount} failed ===`);
})();
