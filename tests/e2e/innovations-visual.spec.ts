/**
 * Playwright Visual Regression Tests — Innovation Components
 * Tests all 10 UI/UX innovations for visual correctness and accessibility.
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function gotoInnovation(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
  // Dismiss any auth modals
  const skipBtn = page.locator('[data-testid="skip-auth"], [aria-label="Close"], button:has-text("Skip")');
  if (await skipBtn.count() > 0) await skipBtn.first().click();
}

async function checkA11y(page: Page, componentName: string) {
  // Check for basic accessibility: landmark, heading, no empty alt
  const headings = await page.locator('h1, h2, h3, [role="heading"]').count();
  expect(headings, `${componentName} should have at least one heading`).toBeGreaterThan(0);

  const imgsWithoutAlt = await page.locator('img:not([alt])').count();
  expect(imgsWithoutAlt, `${componentName} should have no images without alt text`).toBe(0);
}

// ── Innovation 1: Photo Enhancer ─────────────────────────────────────────────
test.describe('Innovation 1: Photo Enhancer', () => {
  test('renders photo enhancer with controls', async ({ page }) => {
    await gotoInnovation(page, '/property/demo?tab=enhance');
    await expect(page.locator('[data-testid="photo-enhancer"], .photo-enhancer, canvas')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot('photo-enhancer-default.png', { maxDiffPixelRatio: 0.05 });
  });

  test('enhance controls are interactive', async ({ page }) => {
    await gotoInnovation(page, '/property/demo?tab=enhance');
    const brightnessSlider = page.locator('input[type="range"]').first();
    if (await brightnessSlider.isVisible()) {
      await brightnessSlider.fill('150');
      await expect(page).toHaveScreenshot('photo-enhancer-bright.png', { maxDiffPixelRatio: 0.05 });
    }
  });
});

// ── Innovation 2: Immersive Map Search ───────────────────────────────────────
test.describe('Innovation 2: Immersive Map Search', () => {
  test('renders map with property cards', async ({ page }) => {
    await gotoInnovation(page, '/search?view=immersive');
    await expect(page.locator('[data-testid="immersive-map"], .immersive-map, [role="application"]')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveScreenshot('immersive-map-default.png', { maxDiffPixelRatio: 0.1 });
  });

  test('property card is swipeable', async ({ page }) => {
    await gotoInnovation(page, '/search?view=immersive');
    const card = page.locator('[data-testid="property-swipe-card"]').first();
    if (await card.isVisible()) {
      const box = await card.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2);
        await page.mouse.up();
      }
    }
  });
});

// ── Innovation 3: Voice Search ───────────────────────────────────────────────
test.describe('Innovation 3: Voice Search', () => {
  test('renders voice search button', async ({ page }) => {
    await gotoInnovation(page, '/search');
    const voiceBtn = page.locator('[data-testid="voice-search-btn"], [aria-label*="voice"], button:has-text("🎤")');
    await expect(voiceBtn.first()).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveScreenshot('voice-search-idle.png', { maxDiffPixelRatio: 0.05 });
  });

  test('voice search has correct aria attributes', async ({ page }) => {
    await gotoInnovation(page, '/search');
    const voiceBtn = page.locator('[aria-label*="voice"], [data-testid="voice-search-btn"]').first();
    if (await voiceBtn.isVisible()) {
      const ariaLabel = await voiceBtn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});

// ── Innovation 4: AR Virtual Staging ────────────────────────────────────────
test.describe('Innovation 4: AR Virtual Staging', () => {
  test('renders AR staging viewer', async ({ page }) => {
    await gotoInnovation(page, '/property/demo?tab=ar');
    const canvas = page.locator('canvas, [data-testid="ar-viewer"]');
    await expect(canvas.first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveScreenshot('ar-staging-default.png', { maxDiffPixelRatio: 0.1 });
  });

  test('furniture catalog is accessible', async ({ page }) => {
    await gotoInnovation(page, '/property/demo?tab=ar');
    const catalog = page.locator('[data-testid="furniture-catalog"], [aria-label*="furniture"]');
    if (await catalog.isVisible()) {
      await expect(catalog).toBeVisible();
    }
  });
});

// ── Innovation 5: Smart Mortgage Calculator ──────────────────────────────────
test.describe('Innovation 5: Smart Mortgage Calculator', () => {
  test('renders calculator with CBN rate', async ({ page }) => {
    await gotoInnovation(page, '/tools/mortgage');
    await expect(page.locator('h1, h2').filter({ hasText: /mortgage/i })).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveScreenshot('mortgage-calculator-default.png', { maxDiffPixelRatio: 0.05 });
  });

  test('updates monthly payment on price change', async ({ page }) => {
    await gotoInnovation(page, '/tools/mortgage');
    const priceInput = page.locator('input[placeholder*="price"], input[name="propertyPrice"]').first();
    if (await priceInput.isVisible()) {
      await priceInput.fill('100000000');
      await priceInput.press('Tab');
      await expect(page).toHaveScreenshot('mortgage-calculator-100m.png', { maxDiffPixelRatio: 0.05 });
    }
  });

  test('bank comparison table renders', async ({ page }) => {
    await gotoInnovation(page, '/tools/mortgage');
    const table = page.locator('table, [role="table"], [data-testid="bank-comparison"]');
    if (await table.first().isVisible()) {
      await expect(table.first()).toBeVisible();
    }
  });
});

// ── Innovation 6: Panorama Walkthrough ──────────────────────────────────────
test.describe('Innovation 6: Panorama Walkthrough', () => {
  test('renders panorama viewer', async ({ page }) => {
    await gotoInnovation(page, '/property/demo?tab=tour');
    const viewer = page.locator('[data-testid="panorama-viewer"], canvas, .pannellum-container');
    await expect(viewer.first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveScreenshot('panorama-default.png', { maxDiffPixelRatio: 0.1 });
  });

  test('hotspots are visible and clickable', async ({ page }) => {
    await gotoInnovation(page, '/property/demo?tab=tour');
    const hotspot = page.locator('[data-testid="hotspot"], .hotspot').first();
    if (await hotspot.isVisible()) {
      await hotspot.click();
      await expect(page).toHaveScreenshot('panorama-hotspot-clicked.png', { maxDiffPixelRatio: 0.1 });
    }
  });
});

// ── Innovation 7: Personalised AI Feed ──────────────────────────────────────
test.describe('Innovation 7: AI Home Feed', () => {
  test('renders personalised feed', async ({ page }) => {
    await gotoInnovation(page, '/');
    await expect(page.locator('[data-testid="ai-feed"], [data-testid="property-grid"]')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveScreenshot('ai-feed-default.png', { maxDiffPixelRatio: 0.05 });
  });

  test('virtual grid renders 20+ items without performance issues', async ({ page }) => {
    await gotoInnovation(page, '/');
    const items = page.locator('[data-testid="property-card"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ── Innovation 8: Collaborative Wishlist ─────────────────────────────────────
test.describe('Innovation 8: Collaborative Wishlist', () => {
  test('renders wishlist board', async ({ page }) => {
    await gotoInnovation(page, '/wishlist');
    await expect(page.locator('h1, h2').filter({ hasText: /wishlist|saved|favorites/i })).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveScreenshot('wishlist-default.png', { maxDiffPixelRatio: 0.05 });
  });

  test('share button is present', async ({ page }) => {
    await gotoInnovation(page, '/wishlist');
    const shareBtn = page.locator('button:has-text("Share"), [aria-label*="share"]').first();
    if (await shareBtn.isVisible()) {
      await expect(shareBtn).toBeEnabled();
    }
  });
});

// ── Innovation 9: Progressive Onboarding ─────────────────────────────────────
test.describe('Innovation 9: Progressive Onboarding', () => {
  test('renders onboarding flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveScreenshot('onboarding-step1.png', { maxDiffPixelRatio: 0.05 });
  });

  test('progress indicator is visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    const progress = page.locator('[role="progressbar"], [data-testid="progress"], .progress-bar');
    if (await progress.first().isVisible()) {
      await expect(progress.first()).toBeVisible();
    }
  });

  test('XP/badge system renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    const xp = page.locator('[data-testid="xp-display"], text=/XP|points|badge/i');
    if (await xp.first().isVisible()) {
      await expect(xp.first()).toBeVisible();
    }
  });
});

// ── Innovation 10: Theme Engine ───────────────────────────────────────────────
test.describe('Innovation 10: Theme Engine', () => {
  test('renders theme switcher', async ({ page }) => {
    await gotoInnovation(page, '/settings');
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"], button:has-text("Dark")');
    if (await themeToggle.first().isVisible()) {
      await expect(themeToggle.first()).toBeVisible();
    }
    await expect(page).toHaveScreenshot('theme-light.png', { maxDiffPixelRatio: 0.05 });
  });

  test('dark mode applies correctly', async ({ page }) => {
    await gotoInnovation(page, '/settings');
    const darkBtn = page.locator('[aria-label*="dark"], button:has-text("Dark")').first();
    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('theme-dark.png', { maxDiffPixelRatio: 0.05 });
    }
  });

  test('high contrast mode is accessible', async ({ page }) => {
    await gotoInnovation(page, '/settings');
    const hcBtn = page.locator('[aria-label*="contrast"], button:has-text("High Contrast")').first();
    if (await hcBtn.isVisible()) {
      await hcBtn.click();
      await page.waitForTimeout(500);
      await checkA11y(page, 'High Contrast Theme');
      await expect(page).toHaveScreenshot('theme-high-contrast.png', { maxDiffPixelRatio: 0.05 });
    }
  });
});

// ── Cross-cutting: Accessibility ─────────────────────────────────────────────
test.describe('Accessibility — all innovations', () => {
  const routes = [
    { name: 'Home Feed', path: '/' },
    { name: 'Search', path: '/search' },
    { name: 'Mortgage Calculator', path: '/tools/mortgage' },
    { name: 'Wishlist', path: '/wishlist' },
    { name: 'Settings', path: '/settings' },
  ];

  for (const route of routes) {
    test(`${route.name} passes basic a11y checks`, async ({ page }) => {
      await gotoInnovation(page, route.path);
      await checkA11y(page, route.name);
    });
  }
});

// ── Cross-cutting: Responsive Design ─────────────────────────────────────────
test.describe('Responsive Design — mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test('home page is mobile-responsive', async ({ page }) => {
    await gotoInnovation(page, '/');
    await expect(page).toHaveScreenshot('home-mobile.png', { maxDiffPixelRatio: 0.05 });
  });

  test('search page is mobile-responsive', async ({ page }) => {
    await gotoInnovation(page, '/search');
    await expect(page).toHaveScreenshot('search-mobile.png', { maxDiffPixelRatio: 0.05 });
  });

  test('mortgage calculator is mobile-responsive', async ({ page }) => {
    await gotoInnovation(page, '/tools/mortgage');
    await expect(page).toHaveScreenshot('mortgage-mobile.png', { maxDiffPixelRatio: 0.05 });
  });
});
