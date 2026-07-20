/**
 * API Health E2E Tests
 *
 * Validates that all critical backend endpoints respond correctly.
 * These tests run against the live server (or a staging environment).
 *
 * Run with: pnpm exec playwright test tests/e2e/api-health.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Backend Health Checks", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body.status).toMatch(/ok|healthy/i);
  });

  test("GET /api/metrics returns Prometheus text format", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    // Prometheus text format starts with # HELP or process_
    expect(text).toMatch(/# HELP|process_/);
  });

  test("tRPC health endpoint responds", async ({ request }) => {
    // tRPC GET request for a simple public query
    const res = await request.get(
      `${BASE}/api/trpc/user.me?input=${encodeURIComponent(JSON.stringify({}))}`
    );
    // Should return 200 (null user) or 401 — not 500
    expect([200, 401]).toContain(res.status());
  });
});

test.describe("Static Assets", () => {
  test("index.html is served with cache-control headers", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    expect(res.status()).toBe(200);
    const cacheControl = res.headers()["cache-control"];
    // Should have no-cache or no-store for HTML (cache-busting)
    if (cacheControl) {
      expect(cacheControl).toMatch(/no-cache|no-store|max-age=0/i);
    }
  });

  test("service worker is served", async ({ request }) => {
    const res = await request.get(`${BASE}/service-worker.js`);
    // SW may not exist in all environments — just check it doesn't 500
    expect(res.status()).not.toBe(500);
  });
});

test.describe("Security Headers", () => {
  test("response includes X-Content-Type-Options header", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const header = res.headers()["x-content-type-options"];
    expect(header).toBe("nosniff");
  });

  test("response includes X-Frame-Options or CSP frame-ancestors", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const xfo = res.headers()["x-frame-options"];
    const csp = res.headers()["content-security-policy"];
    const hasFrameProtection =
      (xfo && /DENY|SAMEORIGIN/i.test(xfo)) ||
      (csp && csp.includes("frame-ancestors"));
    expect(hasFrameProtection).toBeTruthy();
  });

  test("CORS is not wildcard on API routes", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`, {
      headers: { Origin: "https://evil.example.com" },
    });
    const acao = res.headers()["access-control-allow-origin"];
    // Should not be * (wildcard) — must be a specific allowed origin or absent
    expect(acao).not.toBe("*");
  });
});
