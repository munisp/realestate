import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Map Components
 * 
 * Captures screenshots and compares against baselines to detect visual changes
 * Run with: pnpm playwright test --update-snapshots (to update baselines)
 */

test.describe('Map Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(3000); // Wait for map to fully load
  });

  test('map default view matches baseline', async ({ page }) => {
    const mapContainer = page.locator('[class*="map"]').first();
    await expect(mapContainer).toBeVisible();
    
    // Take screenshot and compare
    await expect(page).toHaveScreenshot('map-default-view.png', {
      mask: [page.locator('[class*="logo"]')], // Mask dynamic elements
      maxDiffPixels: 100, // Allow small differences
    });
  });

  test('map zoomed in view matches baseline', async ({ page }) => {
    const zoomInButton = page.locator('button[aria-label*="Zoom in"]');
    
    if (await zoomInButton.isVisible()) {
      // Zoom in 3 times
      await zoomInButton.click();
      await page.waitForTimeout(500);
      await zoomInButton.click();
      await page.waitForTimeout(500);
      await zoomInButton.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('map-zoomed-in.png', {
        maxDiffPixels: 150,
      });
    }
  });

  test('map zoomed out view matches baseline', async ({ page }) => {
    const zoomOutButton = page.locator('button[aria-label*="Zoom out"]');
    
    if (await zoomOutButton.isVisible()) {
      // Zoom out 3 times
      await zoomOutButton.click();
      await page.waitForTimeout(500);
      await zoomOutButton.click();
      await page.waitForTimeout(500);
      await zoomOutButton.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('map-zoomed-out.png', {
        maxDiffPixels: 150,
      });
    }
  });

  test('map satellite view matches baseline', async ({ page }) => {
    const mapTypeButton = page.getByRole('button', { name: /satellite|map type/i });
    
    if (await mapTypeButton.isVisible()) {
      await mapTypeButton.click();
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('map-satellite-view.png', {
        maxDiffPixels: 200,
      });
    }
  });
});

test.describe('Map Clustering Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(3000);
  });

  test('clustered markers view matches baseline', async ({ page }) => {
    // Zoom out to trigger clustering
    const zoomOutButton = page.locator('button[aria-label*="Zoom out"]');
    
    if (await zoomOutButton.isVisible()) {
      await zoomOutButton.click();
      await page.waitForTimeout(500);
      await zoomOutButton.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('map-with-clusters.png', {
        maxDiffPixels: 150,
      });
    }
  });

  test('unclustered markers view matches baseline', async ({ page }) => {
    // Zoom in to show individual markers
    const zoomInButton = page.locator('button[aria-label*="Zoom in"]');
    
    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      await page.waitForTimeout(500);
      await zoomInButton.click();
      await page.waitForTimeout(500);
      await zoomInButton.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('map-without-clusters.png', {
        maxDiffPixels: 150,
      });
    }
  });

  test('cluster expansion animation matches baseline', async ({ page }) => {
    // Click on a cluster
    const cluster = page.locator('[class*="cluster"]').first();
    
    if (await cluster.isVisible()) {
      await cluster.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('map-cluster-expanded.png', {
        maxDiffPixels: 200,
      });
    }
  });
});

test.describe('Street View Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    // Click on first property
    const firstProperty = page.locator('[class*="property"]').first();
    if (await firstProperty.isVisible()) {
      await firstProperty.click();
      await page.waitForTimeout(2000);
    }
  });

  test('street view panorama matches baseline', async ({ page }) => {
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    
    if (await streetViewTab.isVisible()) {
      await streetViewTab.click();
      await page.waitForTimeout(5000); // Wait for Street View to load
      
      await expect(page).toHaveScreenshot('street-view-panorama.png', {
        maxDiffPixels: 300, // Street View may have slight variations
      });
    }
  });

  test('street view thumbnail matches baseline', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(3000);
    
    const thumbnail = page.locator('[class*="street-view-thumbnail"]').first();
    
    if (await thumbnail.isVisible()) {
      await expect(thumbnail).toHaveScreenshot('street-view-thumbnail.png', {
        maxDiffPixels: 100,
      });
    }
  });
});

test.describe('Map Controls Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(2000);
  });

  test('map controls panel matches baseline', async ({ page }) => {
    const controls = page.locator('[class*="controls"]').first();
    
    if (await controls.isVisible()) {
      await expect(controls).toHaveScreenshot('map-controls.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('filter panel matches baseline', async ({ page }) => {
    const filterPanel = page.locator('[class*="filter"]').first();
    
    if (await filterPanel.isVisible()) {
      await expect(filterPanel).toHaveScreenshot('filter-panel.png', {
        maxDiffPixels: 50,
      });
    }
  });
});

test.describe('Map States Visual Regression', () => {
  test('map loading state matches baseline', async ({ page }) => {
    // Navigate and capture loading state quickly
    const promise = page.goto('/properties');
    await page.waitForTimeout(500); // Capture during loading
    
    await expect(page).toHaveScreenshot('map-loading-state.png', {
      maxDiffPixels: 100,
    });
    
    await promise; // Wait for navigation to complete
  });

  test('map empty state matches baseline', async ({ page }) => {
    // Navigate to page with no properties
    await page.goto('/map-search');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('map-empty-state.png', {
      maxDiffPixels: 100,
    });
  });

  test('map error state matches baseline', async ({ page }) => {
    // Simulate error by blocking API
    await page.route('**/api/trpc/**', route => route.abort());
    
    await page.goto('/properties');
    await page.waitForTimeout(3000);
    
    await expect(page).toHaveScreenshot('map-error-state.png', {
      maxDiffPixels: 100,
    });
  });
});

test.describe('Responsive Map Views', () => {
  test('map mobile view matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/properties');
    await page.waitForTimeout(3000);
    
    await expect(page).toHaveScreenshot('map-mobile-view.png', {
      maxDiffPixels: 150,
    });
  });

  test('map tablet view matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/properties');
    await page.waitForTimeout(3000);
    
    await expect(page).toHaveScreenshot('map-tablet-view.png', {
      maxDiffPixels: 150,
    });
  });

  test('map desktop view matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD
    await page.goto('/properties');
    await page.waitForTimeout(3000);
    
    await expect(page).toHaveScreenshot('map-desktop-view.png', {
      maxDiffPixels: 200,
    });
  });
});

test.describe('Map Interactions Visual Regression', () => {
  test('map with drawn polygon matches baseline', async ({ page }) => {
    await page.goto('/map-search');
    await page.waitForTimeout(2000);
    
    const mapContainer = page.locator('[class*="map"]').first();
    
    if (await mapContainer.isVisible()) {
      const box = await mapContainer.boundingBox();
      
      if (box) {
        // Draw a polygon
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.waitForTimeout(300);
        await page.mouse.click(box.x + 200, box.y + 100);
        await page.waitForTimeout(300);
        await page.mouse.click(box.x + 200, box.y + 200);
        await page.waitForTimeout(300);
        await page.mouse.click(box.x + 100, box.y + 200);
        await page.waitForTimeout(300);
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.waitForTimeout(1000);
        
        await expect(page).toHaveScreenshot('map-with-polygon.png', {
          maxDiffPixels: 150,
        });
      }
    }
  });

  test('map with search radius matches baseline', async ({ page }) => {
    await page.goto('/map-search');
    await page.waitForTimeout(2000);
    
    // Set search location and radius
    const locationInput = page.locator('input[placeholder*="location"]').first();
    
    if (await locationInput.isVisible()) {
      await locationInput.fill('Lagos, Nigeria');
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('map-with-radius.png', {
        maxDiffPixels: 200,
      });
    }
  });
});
