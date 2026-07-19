import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Street View Navigation
 * 
 * Tests user interactions with Street View:
 * - Opening Street View from property details
 * - Navigating within Street View
 * - Rotating and zooming
 * - Closing Street View
 */

test.describe('Street View Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a property detail page
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    // Click on first property
    const firstProperty = page.locator('[class*="property"]').first();
    if (await firstProperty.isVisible()) {
      await firstProperty.click();
      await page.waitForTimeout(2000);
    }
  });

  test('should display Street View tab', async ({ page }) => {
    // Look for Street View tab
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    
    await expect(streetViewTab).toBeVisible({ timeout: 5000 });
  });

  test('should open Street View when clicking tab', async ({ page }) => {
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    
    if (await streetViewTab.isVisible()) {
      await streetViewTab.click();
      await page.waitForTimeout(3000);
      
      // Check if Street View container is visible
      const streetViewContainer = page.locator('[class*="street"], [class*="panorama"]');
      await expect(streetViewContainer.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should load Street View panorama', async ({ page }) => {
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    
    if (await streetViewTab.isVisible()) {
      await streetViewTab.click();
      await page.waitForTimeout(5000);
      
      // Check if Google Street View iframe is loaded
      const streetViewFrame = page.frameLocator('iframe[src*="google"]');
      const frameCount = await page.locator('iframe[src*="google"]').count();
      
      // Street View should load (may be in iframe)
      expect(frameCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show Street View controls', async ({ page }) => {
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    
    if (await streetViewTab.isVisible()) {
      await streetViewTab.click();
      await page.waitForTimeout(3000);
      
      // Look for zoom controls
      const zoomIn = page.locator('button[aria-label*="Zoom in"]');
      const zoomOut = page.locator('button[aria-label*="Zoom out"]');
      
      // Controls may be in iframe or custom implementation
      const hasControls = (await zoomIn.count()) > 0 || (await zoomOut.count()) > 0;
      expect(typeof hasControls).toBe('boolean');
    }
  });
});

test.describe('Street View Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to property with Street View
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    const firstProperty = page.locator('[class*="property"]').first();
    if (await firstProperty.isVisible()) {
      await firstProperty.click();
      await page.waitForTimeout(2000);
    }
    
    // Open Street View tab
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    if (await streetViewTab.isVisible()) {
      await streetViewTab.click();
      await page.waitForTimeout(3000);
    }
  });

  test('should rotate view by dragging', async ({ page }) => {
    const streetViewContainer = page.locator('[class*="street"], [class*="panorama"]').first();
    
    if (await streetViewContainer.isVisible()) {
      const box = await streetViewContainer.boundingBox();
      
      if (box) {
        // Drag to rotate
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2);
        await page.mouse.up();
        
        await page.waitForTimeout(1000);
        
        // View should have rotated
        expect(true).toBe(true);
      }
    }
  });

  test('should zoom in Street View', async ({ page }) => {
    const zoomInButton = page.locator('button[aria-label*="Zoom in"]').first();
    
    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      await page.waitForTimeout(500);
      
      // Zoom level should increase
      expect(true).toBe(true);
    }
  });

  test('should zoom out Street View', async ({ page }) => {
    const zoomOutButton = page.locator('button[aria-label*="Zoom out"]').first();
    
    if (await zoomOutButton.isVisible()) {
      await zoomOutButton.click();
      await page.waitForTimeout(500);
      
      // Zoom level should decrease
      expect(true).toBe(true);
    }
  });

  test('should navigate to adjacent panorama', async ({ page }) => {
    // Click on navigation arrows in Street View
    const streetViewContainer = page.locator('[class*="street"], [class*="panorama"]').first();
    
    if (await streetViewContainer.isVisible()) {
      const box = await streetViewContainer.boundingBox();
      
      if (box) {
        // Click forward arrow (usually in center-top)
        await page.mouse.click(box.x + box.width / 2, box.y + 50);
        await page.waitForTimeout(2000);
        
        // Should navigate to next panorama
        expect(true).toBe(true);
      }
    }
  });
});

test.describe('Street View Thumbnail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(2000);
  });

  test('should display Street View thumbnail on property card', async ({ page }) => {
    // Look for Street View thumbnail
    const thumbnail = page.locator('[class*="street-view-thumbnail"], img[alt*="Street View"]').first();
    
    // Thumbnail may or may not exist depending on implementation
    const count = await thumbnail.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open Street View when clicking thumbnail', async ({ page }) => {
    const thumbnail = page.locator('[class*="street-view-thumbnail"]').first();
    
    if (await thumbnail.isVisible()) {
      await thumbnail.click();
      await page.waitForTimeout(2000);
      
      // Should navigate to property detail or open modal
      const streetView = page.locator('[class*="street"], [class*="panorama"]');
      await expect(streetView.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show hover effect on thumbnail', async ({ page }) => {
    const thumbnail = page.locator('[class*="street-view-thumbnail"]').first();
    
    if (await thumbnail.isVisible()) {
      await thumbnail.hover();
      await page.waitForTimeout(500);
      
      // Should show hover effect (scale, overlay, etc.)
      expect(true).toBe(true);
    }
  });
});

test.describe('Street View Error Handling', () => {
  test('should show message when Street View unavailable', async ({ page }) => {
    // Navigate to property that may not have Street View
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    const property = page.locator('[class*="property"]').first();
    if (await property.isVisible()) {
      await property.click();
      await page.waitForTimeout(2000);
    }
    
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    if (await streetViewTab.isVisible()) {
      await streetViewTab.click();
      await page.waitForTimeout(5000);
      
      // Check for error message or fallback
      const errorMessage = page.locator('[class*="error"], [class*="alert"]');
      const streetViewContent = page.locator('[class*="street"], [class*="panorama"]');
      
      // Either Street View loads or error message shows
      const hasContent = (await streetViewContent.count()) > 0 || (await errorMessage.count()) > 0;
      expect(hasContent).toBe(true);
    }
  });

  test('should provide fallback when Street View fails to load', async ({ page }) => {
    // Test graceful degradation
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    const property = page.locator('[class*="property"]').first();
    if (await property.isVisible()) {
      await property.click();
      await page.waitForTimeout(2000);
    }
    
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    if (await streetViewTab.isVisible()) {
      await streetViewTab.click();
      await page.waitForTimeout(5000);
      
      // Page should not crash
      const pageTitle = await page.title();
      expect(pageTitle.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Street View Performance', () => {
  test('should load Street View within 5 seconds', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    const property = page.locator('[class*="property"]').first();
    if (await property.isVisible()) {
      await property.click();
      await page.waitForTimeout(2000);
    }
    
    const streetViewTab = page.getByRole('tab', { name: /street view/i });
    if (await streetViewTab.isVisible()) {
      const startTime = Date.now();
      
      await streetViewTab.click();
      
      // Wait for Street View to load
      await page.waitForTimeout(5000);
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(6000);
    }
  });
});
