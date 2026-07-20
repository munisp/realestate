const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = '/home/ubuntu/realestate_slides_project/images/real_screenshots';

const PAGES = [
  { name: 'home_page', url: '/', desc: 'Home / Landing Page' },
  { name: 'properties_search', url: '/properties', desc: 'Property Search Results' },
  { name: 'market_trends', url: '/market-trends', desc: 'Market Trends Dashboard' },
  { name: 'dashboard', url: '/dashboard', desc: 'User Dashboard' },
  { name: 'agent_performance', url: '/agent/performance', desc: 'Agent Performance Dashboard' },
  { name: 'land_registry', url: '/land-registry', desc: 'Land Registry Dashboard' },
  { name: 'ai_assistant', url: '/ai-assistant', desc: 'AI Assistant / Chat' },
  { name: 'pricing_dashboard', url: '/pricing/dashboard', desc: 'Smart Pricing Dashboard' },
  { name: 'investment_dashboard', url: '/investment-dashboard', desc: 'Investment Dashboard' },
  { name: 'admin_verification', url: '/admin/verification', desc: 'Admin Verification Dashboard' },
  { name: 'neighborhood_lagos', url: '/lagos-neighborhoods', desc: 'Lagos Neighbourhood Explorer' },
  { name: 'builders_marketplace', url: '/builders', desc: 'Builder Marketplace' },
  { name: 'documents_sign', url: '/documents/sign', desc: 'Document Signing (E-Signature)' },
  { name: 'map_advanced', url: '/map/advanced', desc: 'Advanced Map Search' },
  { name: 'analytics', url: '/analytics', desc: 'Analytics Dashboard' },
  { name: 'mobile_view', url: '/', desc: 'Mobile Home View', mobile: true },
];

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const results = [];

  for (const page of PAGES) {
    const context = await browser.newContext({
      viewport: page.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: 1.5
    });

    const p = await context.newPage();

    try {
      console.log(`Capturing: ${page.desc} (${page.url})`);
      await p.goto(`${BASE_URL}${page.url}`, { waitUntil: 'networkidle', timeout: 20000 });
      await p.waitForTimeout(3000);

      // Proper 404 detection: check visible heading text, not raw HTML/JS
      const is404 = await p.evaluate(() => {
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        const text = (h1?.textContent || '') + (h2?.textContent || '');
        return text.toLowerCase().includes('not found') || text.toLowerCase().includes('page not found');
      });

      if (is404) {
        console.log(`  ⚠️  404 page detected on ${page.url} — skipping`);
        await context.close();
        continue;
      }

      const outputPath = path.join(OUTPUT_DIR, `${page.name}.png`);
      await p.screenshot({
        path: outputPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: page.mobile ? 390 : 1440, height: page.mobile ? 844 : 900 }
      });

      // Get the page title for confirmation
      const h1Text = await p.locator('h1').first().textContent().catch(() => '(no h1)');
      console.log(`  ✅ Saved: ${page.name}.png — "${h1Text.trim()}"`);
      results.push({ name: page.name, path: outputPath, desc: page.desc, url: page.url });
    } catch (err) {
      console.log(`  ❌ Error on ${page.url}: ${err.message}`);
    }

    await context.close();
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log(`Captured ${results.length} / ${PAGES.length} screenshots:`);
  results.forEach(r => console.log(`  ✅ ${r.name}: ${r.url}`));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(results, null, 2)
  );
}

captureScreenshots().catch(console.error);
