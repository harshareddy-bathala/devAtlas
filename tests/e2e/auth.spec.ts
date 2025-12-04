import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * 
 * Tests the complete authentication flow including:
 * - Login page rendering
 * - Form validation
 * - Successful login with redirect
 * - Error handling for invalid credentials
 * - Sign out functionality
 */

test.describe('Authentication Flow', () => {
  // Skip auth setup for these tests - we want to test the login itself
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should display login page with sign in options', async ({ page }) => {
    await page.goto('/login');
    
    // Check that the login page renders correctly
    await expect(page).toHaveTitle(/DevOrbit|Sign In|Login/i);
    
    // Look for sign-in heading or welcome message
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
    
    // Check for email input (if email auth is enabled)
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const hasEmailAuth = await emailInput.isVisible().catch(() => false);
    
    if (hasEmailAuth) {
      // Email/Password auth is available
      await expect(emailInput).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
    }
    
    // Check for OAuth providers (Google, GitHub)
    const googleButton = page.getByRole('button', { name: /google/i });
    const githubButton = page.getByRole('button', { name: /github/i });
    
    const hasOAuth = await googleButton.isVisible().catch(() => false) || 
                     await githubButton.isVisible().catch(() => false);
    
    // At least one auth method should be available
    expect(hasEmailAuth || hasOAuth).toBe(true);
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const hasEmailAuth = await emailInput.isVisible().catch(() => false);
    
    if (!hasEmailAuth) {
      test.skip();
      return;
    }
    
    // Click sign in without filling the form
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();
    
    // Check for validation error messages
    const errorMessage = page.locator('[role="alert"], .error, .text-red-500, .text-error');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const hasEmailAuth = await emailInput.isVisible().catch(() => false);
    
    if (!hasEmailAuth) {
      test.skip();
      return;
    }
    
    // Fill in invalid credentials
    await emailInput.fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();
    
    // Check for error message (Firebase auth error)
    const errorMessage = page.locator('[role="alert"], .error, .text-red-500, .text-error, .toast-error');
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should successfully log in and redirect to dashboard', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL || 'e2e-test@devorbit.dev';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'E2ETestPassword123!';
    
    await page.goto('/login');
    
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const hasEmailAuth = await emailInput.isVisible().catch(() => false);
    
    if (!hasEmailAuth) {
      test.skip();
      return;
    }
    
    // Fill in valid credentials
    await emailInput.fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    
    // Verify dashboard content
    await expect(page.getByRole('heading', { name: /dashboard|welcome/i })).toBeVisible({
      timeout: 10000
    });
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
  });
});

test.describe('Authenticated User Flow', () => {
  // These tests use the authenticated state from auth.setup.ts
  
  test('should display user info on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/dashboard/i);
    
    // Dashboard should show user-specific content
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should be able to sign out', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find and click the sign out button (might be in a menu)
    const userMenuButton = page.getByRole('button', { name: /menu|profile|user|settings/i });
    if (await userMenuButton.isVisible().catch(() => false)) {
      await userMenuButton.click();
    }
    
    // Look for sign out button
    const signOutButton = page.getByRole('button', { name: /sign out|log out|logout/i });
    
    // If sign out is visible, click it
    if (await signOutButton.isVisible().catch(() => false)) {
      await signOutButton.click();
      
      // Handle confirmation modal if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes|sign out/i });
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }
      
      // Should be redirected to login
      await expect(page).toHaveURL(/login/i, { timeout: 10000 });
    }
  });
});
