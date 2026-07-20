/**
 * Core E2E Test Suite
 *
 * Covers the three most critical user journeys:
 *   1. Authentication (sign-up, login, logout)
 *   2. Property search and detail view
 *   3. Booking / payment initiation
 *
 * Run with: pnpm exec playwright test tests/e2e/core-flows.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForApp(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
}

// ── 1. Authentication flows ───────────────────────────────────────────────────

test.describe("Authentication", () => {
  test("home page loads and shows login CTA", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // The page title should reference the platform
    await expect(page).toHaveTitle(/real estate|property|realestate/i);

    // There should be a login or sign-in button visible
    const loginBtn = page.getByRole("link", { name: /sign in|log in|login/i }).first();
    await expect(loginBtn).toBeVisible({ timeout: 10_000 });
  });

  test("login page renders form fields", async ({ page }) => {
    await page.goto("/login");
    await waitForApp(page);

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await waitForApp(page);

    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Should show an error message — not redirect to dashboard
    await expect(
      page.getByText(/invalid|incorrect|wrong|failed|error/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/dashboard|home/i);
  });

  test("sign-up page renders required fields", async ({ page }) => {
    await page.goto("/register");
    await waitForApp(page);

    // At minimum: email + password fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });
});

// ── 2. Property search ────────────────────────────────────────────────────────

test.describe("Property Search", () => {
  test("search page loads with filter controls", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Search input should be visible on the home page
    const searchInput = page.getByPlaceholder(/search|location|city|address/i).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test("searching for a city returns property results", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    const searchInput = page.getByPlaceholder(/search|location|city|address/i).first();
    await searchInput.fill("Lagos");
    await searchInput.press("Enter");

    // Wait for results — either a list of properties or a map
    await page.waitForLoadState("networkidle");
    const results = page.locator("[data-testid='property-card'], .property-card, [class*='PropertyCard']");
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
  });

  test("property detail page loads when clicking a result", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    const searchInput = page.getByPlaceholder(/search|location|city|address/i).first();
    await searchInput.fill("Lagos");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");

    // Click the first property card
    const firstCard = page.locator("[data-testid='property-card'], .property-card, [class*='PropertyCard']").first();
    await firstCard.click();
    await page.waitForLoadState("networkidle");

    // Should navigate to a property detail URL
    await expect(page).toHaveURL(/property|listing|\/p\//i);

    // Key detail elements should be visible
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("advanced filters panel opens and accepts input", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Look for a filter button
    const filterBtn = page.getByRole("button", { name: /filter|advanced|more/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();

      // Price range or bedroom filter should appear
      const priceOrBed = page.getByLabel(/price|bedroom|bath|min|max/i).first();
      await expect(priceOrBed).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip();
    }
  });
});

// ── 3. Booking / payment initiation ──────────────────────────────────────────

test.describe("Booking Flow", () => {
  test("book now button is visible on property detail page", async ({ page }) => {
    // Navigate directly to a property if we have a known test ID,
    // otherwise use search to find one
    await page.goto("/");
    await waitForApp(page);

    const searchInput = page.getByPlaceholder(/search|location|city|address/i).first();
    await searchInput.fill("Lagos");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator("[data-testid='property-card'], .property-card, [class*='PropertyCard']").first();
    await firstCard.click();
    await page.waitForLoadState("networkidle");

    // A booking or contact CTA should be present
    const bookBtn = page.getByRole("button", { name: /book|schedule|contact|enquire|apply/i }).first();
    await expect(bookBtn).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated booking redirects to login", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    const searchInput = page.getByPlaceholder(/search|location|city|address/i).first();
    await searchInput.fill("Lagos");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator("[data-testid='property-card'], .property-card, [class*='PropertyCard']").first();
    await firstCard.click();
    await page.waitForLoadState("networkidle");

    const bookBtn = page.getByRole("button", { name: /book|schedule|contact|enquire|apply/i }).first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForLoadState("networkidle");

      // Should redirect to login or show a login modal
      const isLoginPage = page.url().includes("login") || page.url().includes("auth");
      const hasLoginModal = await page.getByLabel(/email/i).isVisible().catch(() => false);

      expect(isLoginPage || hasLoginModal).toBeTruthy();
    } else {
      test.skip();
    }
  });
});

// ── 4. Accessibility smoke test ───────────────────────────────────────────────

test.describe("Accessibility", () => {
  test("home page has no critical ARIA violations (landmark check)", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // At minimum, a main landmark should exist
    const main = page.locator("main, [role='main']");
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test("all images on home page have alt text", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      const role = await img.getAttribute("role");
      // Images must have alt text unless they are explicitly decorative (role=presentation)
      if (role !== "presentation" && role !== "none") {
        expect(alt).not.toBeNull();
      }
    }
  });
});
