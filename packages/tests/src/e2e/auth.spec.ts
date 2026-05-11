/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('has email and password fields', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('has a submit button', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    // Should stay on login page (no redirect)
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('shows error for invalid email format', async ({ page }) => {
    await page.getByRole('textbox', { name: /email/i }).fill('not-an-email');
    await page.locator('input[type="password"]').fill('somepassword');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('has link to signup page', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await expect(signupLink).toBeVisible();
  });
});

test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('renders the signup form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('has name, email, and password fields', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows validation error when name is empty', async ({ page }) => {
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    // Name required error should appear
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.getByRole('textbox', { name: /name/i }).fill('Test User');
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.locator('input[type="password"]').fill('short');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/min 8 characters/i)).toBeVisible();
  });

  test('has link back to login page', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();
  });
});

test.describe('Auth page navigation', () => {
  test('login page links to signup', async ({ page }) => {
    await page.goto('/auth/login');
    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await signupLink.click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('signup page links to login', async ({ page }) => {
    await page.goto('/auth/signup');
    const loginLink = page.locator('a[href="/auth/login"]').first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
