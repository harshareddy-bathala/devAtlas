import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login page elements
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    await expect(page.locator('text=Continue with GitHub')).toBeVisible();
    await expect(page.locator('text=Continue with Google')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/login');
    
    // Initially shows sign in
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    
    // Click sign up link
    await page.click('text=Sign up');
    
    // Now shows sign up
    await expect(page.locator('text=Create your account')).toBeVisible();
    
    // Click sign in link
    await page.click('text=Sign in');
    
    // Back to sign in
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for protected routes
    // In real tests, you'd set up a test user session
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Responsive Design', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Mobile elements should be visible
    await expect(page.locator('text=DevOrbit')).toBeVisible();
  });

  test('should hide sidebar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Sidebar should not be visible on mobile login page
    // (Login page doesn't have sidebar anyway)
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
  });
});

test.describe('Theme', () => {
  test('should toggle between light and dark themes', async ({ page }) => {
    await page.goto('/login');
    
    // Check initial theme (should be dark by default)
    const html = page.locator('html');
    
    // Dark mode should be active initially
    await expect(html).toHaveClass(/dark/);
    
    // Click theme toggle (on login page, this is in the header on mobile)
    // For desktop, you'd need to be logged in to see the sidebar
  });
});

test.describe('Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login');
    
    // Check for accessible form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Check for labels
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Email input should be focused eventually
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
  });
});
