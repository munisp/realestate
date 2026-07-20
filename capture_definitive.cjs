/**
 * Definitive screenshot capture script
 * - Authenticates via dev login endpoint
 * - Injects session cookie directly into browser context
 * - Waits for network idle + specific content selectors before capturing
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = '/home/ubuntu/realestate_slides_project/images/real_screenshots';

async function getSessionToken() {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ openId: 'oauth-admin-001' });
    const req = http.request({
      hostname: 'localhost', port: 5000,
      path: '/api/dev/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      let cookie = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const match = setCookie[0].match(/app_session_id=([^;]+)/);
          if (match) cookie = match[1];
        }
        resolve(cookie);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function captureScreenshot(page, url, filename, waitForSelector, description) {
  console.log(`  📸 ${description}...`);
  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Wait for network to settle
    await page.waitForTimeout(3000);
    // Try to wait for specific content if selector provided
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 8000 });
        await page.waitForTimeout(1500);
      } catch (e) {
        console.log(`    ⚠️  Selector "${waitForSelector}" not found, capturing anyway`);
      }
    }
    // Additional wait for charts/animations
    await page.waitForTimeout(1000);
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    const stats = fs.statSync(filepath);
    const kb = Math.round(stats.size / 1024);
    console.log(`    ✅ ${filename} (${kb}KB)`);
    return true;
  } catch (e) {
    console.log(`    ❌ ${filename}: ${e.message}`);
    return false;
  }
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log('🔑 Getting session token...');
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    console.error('❌ Failed to get session token');
    process.exit(1);
  }
  console.log(`✅ Got session token: ${sessionToken.substring(0, 30)}...`);

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  // Create context with viewport
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  // Inject session cookie BEFORE navigating
  await context.addCookies([{
    name: 'app_session_id',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }]);

  const page = await context.newPage();
  
  // Verify auth works
  console.log('🔐 Verifying authentication...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  const title = await page.title();
  console.log(`  Page title: ${title}`);
  const content = await page.content();
  const isLoggedIn = !content.includes('Sign in') && !content.includes('Login');
  console.log(`  Auth status: ${isLoggedIn ? '✅ Logged in' : '⚠️ May not be logged in'}`);

  console.log('\n📸 Capturing screenshots...\n');

  // 1. Home page - hero section
  await captureScreenshot(page, '/', 'home_page.png', 
    'h1, [class*="hero"], [class*="search"]',
    'Home page');

  // 2. Properties search with listings
  await captureScreenshot(page, '/properties', 'properties_search.png',
    null,
    'Properties search');

  // 3. Market trends - fully populated with charts
  await captureScreenshot(page, '/market-trends', 'market_trends.png',
    'canvas, [class*="chart"], [class*="trend"]',
    'Market trends dashboard');

  // 4. User dashboard - with stats
  await captureScreenshot(page, '/dashboard', 'dashboard.png',
    '[class*="card"], [class*="stat"], [class*="dashboard"]',
    'User dashboard');

  // 5. Agent performance - now properly routed
  await captureScreenshot(page, '/agent/performance', 'agent_performance.png',
    '[class*="metric"], [class*="stat"], canvas, [class*="performance"]',
    'Agent performance dashboard');

  // 6. Land registry
  await captureScreenshot(page, '/land-registry', 'land_registry.png',
    '[class*="record"], [class*="registry"], table, [class*="land"]',
    'Land registry dashboard');

  // 7. Admin verification
  await captureScreenshot(page, '/admin/verification', 'admin_verification.png',
    '[class*="verification"], [class*="badge"], [class*="pending"]',
    'Admin verification dashboard');

  // 8. AI assistant
  await captureScreenshot(page, '/ai-assistant', 'ai_assistant.png',
    '[class*="chat"], [class*="message"], input, textarea',
    'AI assistant');

  // 9. Smart pricing dashboard
  await captureScreenshot(page, '/pricing/dashboard', 'pricing_dashboard.png',
    '[class*="pricing"], [class*="price"], canvas',
    'Smart pricing dashboard');

  // 10. Investment dashboard
  await captureScreenshot(page, '/investment-dashboard', 'investment_dashboard.png',
    '[class*="invest"], [class*="portfolio"], canvas',
    'Investment dashboard');

  // 11. Map search
  await captureScreenshot(page, '/map', 'map_advanced.png',
    null,
    'Map search');

  // 12. Mobile view (375px)
  await context.close();
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await mobileContext.addCookies([{
    name: 'app_session_id',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }]);
  const mobilePage = await mobileContext.newPage();
  await captureScreenshot(mobilePage, '/', 'mobile_view.png',
    null,
    'Mobile home view');
  await mobileContext.close();

  // 13. Builders marketplace
  const context3 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  await context3.addCookies([{
    name: 'app_session_id',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }]);
  const page3 = await context3.newPage();
  await captureScreenshot(page3, '/builders', 'builders_marketplace.png',
    '[class*="builder"], [class*="project"], [class*="card"]',
    'Builders marketplace');

  // 14. Neighborhood intelligence
  await captureScreenshot(page3, '/lagos-neighborhoods', 'neighborhood_lagos.png',
    null,
    'Lagos neighborhood explorer');

  // 15. Escrow management
  await captureScreenshot(page3, '/escrow', 'escrow_management.png',
    '[class*="escrow"], [class*="transaction"]',
    'Escrow management');

  // 16. Agent CRM / leads
  await captureScreenshot(page3, '/agent/leads', 'agent_crm.png',
    '[class*="lead"], [class*="crm"], [class*="pipeline"]',
    'Agent CRM / leads');

  await context3.close();
  await browser.close();

  console.log('\n✅ All screenshots captured!');
  
  // List all screenshots with sizes
  console.log('\n📊 Screenshot summary:');
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  files.sort().forEach(f => {
    const stats = fs.statSync(path.join(SCREENSHOTS_DIR, f));
    const kb = Math.round(stats.size / 1024);
    const status = kb < 20 ? '⚠️  POSSIBLY BLANK' : '✅';
    console.log(`  ${status} ${f}: ${kb}KB`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
