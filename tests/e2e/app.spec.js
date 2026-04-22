const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('voice2english', () => {
  test('homepage loads with title and tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('voice2english');
    await expect(page.getByText('🎙  Record')).toBeVisible();
    await expect(page.getByText('📎  Upload File')).toBeVisible();
  });

  test('switches between Record and Upload tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /start recording/i })).toBeVisible();
    await page.getByText('📎  Upload File').click();
    await expect(page.getByText('Drop audio file or click to browse')).toBeVisible();
  });

  test('uploads file and shows results', async ({ page }) => {
    await page.route('/api/pipeline', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        transcript: 'नमस्ते दुनिया',
        translation: 'Hello world',
        timing: { sttMs: 1200, translateMs: 400, totalMs: 1600 },
      }),
    }));

    await page.goto('/');
    await page.getByText('📎  Upload File').click();
    await page.locator('input[type=file]').setInputFiles(path.resolve('tests/fixtures/silence.wav'));

    await expect(page.getByText('नमस्ते दुनिया')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hello world')).toBeVisible();
    await expect(page.getByText('1.2s')).toBeVisible();
  });

  test('evaluation shows BLEU and WER scores', async ({ page }) => {
    await page.route('/api/pipeline', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript: 'नमस्ते', translation: 'Hello world', timing: { sttMs: 800, translateMs: 300, totalMs: 1100 } }),
    }));
    await page.route('/api/evaluate', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bleu: 0.87, wer: 0.083 }),
    }));

    await page.goto('/');
    await page.getByText('📎  Upload File').click();
    await page.locator('input[type=file]').setInputFiles(path.resolve('tests/fixtures/silence.wav'));
    await expect(page.getByText('Hello world')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder(/reference/i).fill('Hello earth');
    await page.getByRole('button', { name: /run evaluation/i }).click();
    await expect(page.getByText('0.870')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('8.3%')).toBeVisible();
  });

  test('persists last result after page reload', async ({ page }) => {
    await page.route('/api/pipeline', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript: 'नमस्ते', translation: 'Hello', timing: { sttMs: 500, translateMs: 200, totalMs: 700 } }),
    }));

    await page.goto('/');
    await page.getByText('📎  Upload File').click();
    await page.locator('input[type=file]').setInputFiles(path.resolve('tests/fixtures/silence.wav'));
    await expect(page.getByText('Hello')).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.getByText('Hello')).toBeVisible();
  });
});
