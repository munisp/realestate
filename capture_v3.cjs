const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = '/home/ubuntu/realestate_slides_project/images/real_screenshots';

// Only use confirmed valid routes from App.tsx
const PAGES = [
  {
    name: 'home_page',
    url: '/',
    waitFor: 'networkidle',
    desc: 'Home / Landing Page'
  },
  {
    name: 'properties_search',
    url: '/properties',
    waitFor: 'networkidle',
    desc: 'Property Search Results'
  },
  {
    name: 'market_trends',
    url: '/market-trends',
    waitFor: 'networkidle',
    desc: 'Market Trends Dashboard'
  },
  {
    name: 'dashboard',
    url: '/dashboard',
    waitFor: 'networkidle',
    desc: 'User Dashboard'
  },
  {
    name: 'agent_performance',
    url: '/agent/performance',
    waitFor: 'networkidle',
    desc: 'Agent Performance Dashboard'
  },
  {
    name: 'land_registry',
    url: '/land-registry',
    waitFor: 'networkidle',
    desc: 'Land Registry Dashboard'
  },
  {
    name: 'ai_assistant',
    url: '/ai-assistant',
    waitFor: 'networkidle',
    desc: 'AI Assistant / Chat'
  },
  {
    name: 'pricing_dashboard',
    url: '/pricing/dashboard',
    waitFor: 'networkidle',
    desc: 'Smart Pricing Dashboard'
  },
  {
    name: 'investment_dashboard',
    url: '/investment-dashboard',
    waitFor: 'networkidle',
    desc: 'Investment Dashboard'
  },
  {
    name: 'admin_verification',
    url: '/admin/verification',
    waitFor: 'networkidle',
    desc: 'Admin Verification Dashboard'
  },
  {
    name: 'neighborhood_lagos',
    url: '/lagos-neighborhoods',
    waitFor: 'networkidle',
    desc: 'Lagos Neighbourhood Explorer'
  },
  {
    name: 'builders_marketplace',
    url: '/builders',
    waitFor: 'networkidle',
    desc: 'Builder Marketplace'
  },
  {
    name: 'documents_sign',
    url: '/documents/sign',
    waitFor: 'networkidle',
    desc: 'Document Signing (E-Signature)'
  },
  {
    name: 'map_advanced',
    url: '/map/advanced',
    waitFor: 'networkidle',
    desc: 'Advanced Map Search'
  },
  {
    name: 'analytics',
    url: '/analytics',
    waitFor: 'networkidle',
    desc: 'Analytics Dashboard'
  },
  {
    name: 'mobile_view',
    url: '/',
    waitFor: 'networkidle',
    desc: 'Mobile Home View',
    mobile: true
  }
];

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const results = [];

  for (const page of PAGES) {
    const context = await browser.newContext({
      viewport: page.mobile 
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      deviceScaleFactor: 1.5
    });

    const p = await context.newPage();
    
    try {
      console.log(`Capturing: ${page.desc} (${page.url})`);
      await p.goto(`${BASE_URL}${page.url}`, { 
        waitUntil: page.waitFor,
        timeout: 20000
      });
      
      // Wait a bit for JS rendering
      await p.waitForTimeout(3000);
      
      // Check for 404 text
      const bodyText = await p.textContent('body').catch(() => '');
      const is404 = bodyText.includes('404') || bodyText.includes('Page Not Found') || bodyText.includes('not found');
      
      if (is404) {
        console.log(`  ⚠️  404 detected on ${page.url} — skipping`);
        await context.close();
        continue;
      }

      const outputPath = path.join(OUTPUT_DIR, `${page.name}.png`);
      await p.screenshot({ 
        path: outputPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: page.mobile ? 390 : 1440, height: page.mobile ? 844 : 900 }
      });
      
      console.log(`  ✅ Saved: ${outputPath}`);
      results.push({ name: page.name, path: outputPath, desc: page.desc, url: page.url });
    } catch (err) {
      console.log(`  ❌ Error on ${page.url}: ${err.message}`);
    }

    await context.close();
  }

  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  console.log(`Captured ${results.length} screenshots:`);
  results.forEach(r => console.log(`  ${r.name}: ${r.url}`));
  
  // Save manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(results, null, 2)
  );
}

captureScreenshots().catch(console.error);
