import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Global Authentication Setup
 * 
 * This setup project runs once before all other tests.
 * It handles Firebase authentication and saves the auth state
 * so other tests don't need to log in again.
 * 
 * For E2E testing with Firebase, we have several options:
 * 1. Use a dedicated test account with email/password
 * 2. Mock the Firebase auth entirely
 * 3. Use Firebase Auth emulator
 * 
 * This setup uses option 1 - a real test account.
 * Create a test user in Firebase console with the credentials below.
 */

// Test account credentials - use environment variables in CI
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@devorbit.dev';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2ETestPassword123!';

setup('authenticate', async ({ page }) => {
  // Navigate to the login page
  await page.goto('/login');
  
  // Wait for the login page to load
  await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible({ 
    timeout: 10000 
  });
  
  // Check if there's an email/password login form
  const emailInput = page.getByRole('textbox', { name: /email/i });
  const passwordInput = page.getByLabel(/password/i);
  
  // If email login is available
  if (await emailInput.isVisible()) {
    // Fill in the login form
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i });
    await submitButton.click();
    
    // Wait for successful redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    
    // Verify we're logged in by checking for dashboard content
    await expect(page.getByRole('heading', { name: /dashboard|welcome/i })).toBeVisible({
      timeout: 10000
    });
  } else {
    // If only OAuth is available, we need to handle this differently
    // For CI, consider using Firebase Auth emulator
    console.warn('Email/password login not visible. Skipping auth setup.');
    console.warn('Consider enabling email auth or using Firebase Auth emulator.');
    
    // For now, we'll still try to save state even without login
    // Tests that require auth will need to handle this
  }
  
  // Save the authentication state
  await page.context().storageState({ path: authFile });
});

/**
 * Alternative: Mock Firebase Auth for E2E tests
 * 
 * If you want to bypass Firebase entirely in tests,
 * you can inject a mock auth context. Uncomment and adapt:
 * 
 * setup('mock-auth', async ({ page }) => {
 *   await page.goto('/');
 *   
 *   // Inject mock user into localStorage/sessionStorage
 *   await page.evaluate(() => {
 *     const mockUser = {
 *       uid: 'e2e-test-user-id',
 *       email: 'e2e-test@devorbit.dev',
 *       displayName: 'E2E Test User',
 *       emailVerified: true,
 *     };
 *     
 *     // Simulate Firebase auth state
 *     localStorage.setItem('firebase:authUser', JSON.stringify(mockUser));
 *   });
 *   
 *   await page.context().storageState({ path: authFile });
 * });
 */
