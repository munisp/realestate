const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000';
const OUTPUT_DIR = '/home/ubuntu/realestate_slides_project/images/real_screenshots';

// Pages to capture with auth
const PAGES = [
  { name: 'home_page',           url: '/',                    desc: 'Home / Landing Page',           auth: false },
  { name: 'properties_search',   url: '/properties',          desc: 'Property Search Results',       auth: false },
  { name: 'market_trends',       url: '/market-trends',       desc: 'Market Trends Dashboard',       auth: false },
  { name: 'ai_assistant',        url: '/ai-assistant',        desc: 'AI Real Estate Assistant',      auth: false },
  { name: 'land_registry',       url: '/land-registry',       desc: 'Land Registry',                 auth: true  },
  { name: 'pricing_dashboard',   url: '/pricing/dashboard',   desc: 'Smart Pricing Dashboard',       auth: true  },
  { name: 'investment_dashboard',url: '/investment-dashboard',desc: 'Investment Dashboard',          auth: true  },
  { name: 'admin_verification',  url: '/admin/verification',  desc: 'Admin Verification Dashboard',  auth: true  },
  { name: 'agent_performance',   url: '/agent/performance',   desc: 'Agent Performance Dashboard',   auth: true  },
  { name: 'dashboard',           url: '/dashboard',           desc: 'User Dashboard',                auth: true  },
  { name: 'neighborhood_lagos',  url: '/lagos-neighborhoods', desc: 'Lagos Neighbourhood Explorer',  auth: false },
  { name: 'builders_marketplace',url: '/builders',            desc: 'Builder Marketplace',           auth: false },
  { name: 'map_advanced',        url: '/map/advanced',        desc: 'Advanced Map Search',           auth: false },
  { name: 'mobile_view',         url: '/',                    desc: 'Mobile Home View',              auth: false, mobile: true },
];

async function getSessionCookie() {
  const res = await fetch(`${API_URL}/api/dev/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openId: 'oauth-admin-001' })
  });
  const text = await res.text();
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('No Set-Cookie header from dev login: ' + text);
  // Parse: app_session_id=TOKEN; ...
  const match = setCookie.match(/app_session_id=([^;]+)/);
  if (!match) throw new Error('Could not parse session cookie: ' + setCookie);
  return { name: 'app_session_id', value: match[1], domain: 'localhost', path: '/' };
}

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Getting session cookie from dev login endpoint...');
  const sessionCookie = await getSessionCookie();
  console.log(`Got session cookie: ${sessionCookie.value.substring(0, 30)}...`);

  const results = [];

  for (const page of PAGES) {
    const viewport = page.mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 };

    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1.5
    });

    // Inject session cookie for auth pages
    if (page.auth) {
      await context.addCookies([sessionCookie]);
    }

    const p = await context.newPage();

    try {
      console.log(`Capturing: ${page.desc} (${page.url}) [auth=${page.auth}]`);
      await p.goto(`${BASE_URL}${page.url}`, { waitUntil: 'networkidle', timeout: 25000 });
      await p.waitForTimeout(4000);

      // Check for real 404 (not found in visible heading)
      const is404 = await p.evaluate(() => {
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        const text = ((h1?.textContent || '') + (h2?.textContent || '')).toLowerCase();
        return text.includes('not found') || text.includes('page not found') || text.includes('404');
      });

      // Check for login wall
      const isLoginWall = await p.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        const hasLoginBtn = !!document.querySelector('button[type="submit"], a[href*="login"]');
        return (text.includes('please log in') || text.includes('sign in to')) && hasLoginBtn;
      });

      if (is404) {
        console.log(`  ⚠️  404 page on ${page.url} — skipping`);
        await context.close();
        continue;
      }

      if (isLoginWall && !page.auth) {
        console.log(`  ⚠️  Login wall on ${page.url} (no auth) — skipping`);
        await context.close();
        continue;
      }

      // Get visible heading for confirmation
      const h1Text = await p.locator('h1').first().textContent().catch(() => '(no h1)');

      const outputPath = path.join(OUTPUT_DIR, `${page.name}.png`);
      await p.screenshot({
        path: outputPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: viewport.width, height: viewport.height }
      });

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
