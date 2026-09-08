import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('attention blocks future contributions and exports the actual matrices', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?lang=en#attention');
  await expect(page.getByRole('heading', { name: 'What can a token see?' })).toBeVisible();
  const baseline = await page.getByTestId('attention-output').textContent();
  await page.getByRole('switch', { name: /Perturb the last V/ }).check();
  await expect(page.getByTestId('attention-output')).toHaveText(baseline!);
  await expect(page.getByTestId('attention-delta')).toHaveText('+0.000');
  await page.getByRole('switch', { name: /Causal mask/ }).uncheck();
  await expect(page.getByTestId('attention-output')).not.toHaveText(baseline!);
  await expect(page.getByTestId('attention-delta')).not.toHaveText('+0.000');
  await page.getByRole('switch', { name: /Causal mask/ }).check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export experiment JSON' }).click();
  const download = await downloadPromise;
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(data.schemaVersion).toBe(1);
  expect(data.data.v[4][0]).toBe(3);
  expect(data.data.maskedScores[0][1]).toBeNull();
  expect(data.data.weights[0]).toEqual([1, 0, 0, 0, 0]);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('attention-output')).toHaveText(baseline!);
  expect(errors).toEqual([]);
});

test('sampling validates seeds, reproduces draws, and clears stale results', async ({ page }) => {
  await page.goto('/?lang=en#sampling');
  await page.getByRole('button', { name: 'Run 1,000 draws' }).click();
  await expect(page.getByTestId('sample-count')).toHaveText('1,000');
  const first = await page.locator('.draw-tokens').textContent();
  await page.getByRole('button', { name: 'Run 1,000 draws' }).click();
  await expect(page.locator('.draw-tokens')).toHaveText(first!);
  await page.getByLabel('Random seed').fill('43');
  await expect(page.getByTestId('sample-count')).toHaveText('0');
  await page.getByRole('button', { name: 'Run 1,000 draws' }).click();
  await expect(page.locator('.draw-tokens')).not.toHaveText(first!);
  await page.getByLabel('Random seed').fill('');
  await expect(page.getByRole('button', { name: 'Draw next ↗' })).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText('Enter an integer from 0 to 4294967295.');
  await page.getByLabel('Random seed').fill('42');
  await page.getByLabel('Temperature T').focus();
  await page.keyboard.press('Home');
  await page.getByRole('button', { name: 'Run 1,000 draws' }).click();
  await expect(page.locator('.draw-token')).toHaveCount(24);
  expect(await page.locator('.draw-token').allTextContents()).toEqual(Array(24).fill('birds'));
});

test('BPE can merge, undo, change Unicode corpus, and handle empty input', async ({ page }) => {
  await page.goto('/?lang=en#bpe');
  const before = Number(await page.getByTestId('bpe-token-count').textContent());
  await page.getByRole('button', { name: 'Merge one step →' }).click();
  expect(Number(await page.getByTestId('bpe-token-count').textContent())).toBeLessThan(before);
  await page.getByRole('button', { name: '← Undo last merge' }).click();
  await expect(page.getByTestId('bpe-token-count')).toHaveText(`${before}`);
  await page.getByRole('button', { name: 'Traditional Chinese', exact: true }).click();
  await page.getByRole('button', { name: 'Merge one step →' }).click();
  await expect(page.locator('.merge-history')).toContainText('學 + 習');
  await page.getByRole('textbox').fill('😀a 😀a');
  await expect(page.getByRole('button', { name: 'Merge one step →' })).toBeDisabled();
  await page.getByRole('button', { name: 'Apply corpus and restart' }).click();
  await expect(page.getByTestId('bpe-token-count')).toHaveText('4');
  await page.getByRole('button', { name: 'Merge one step →' }).click();
  await expect(page.getByTestId('bpe-token-count')).toHaveText('2');
  await expect(page.getByRole('button', { name: 'Merge one step →' })).toBeDisabled();
  await page.getByRole('textbox').fill('');
  await page.getByRole('button', { name: 'Apply corpus and restart' }).click();
  await expect(page.getByTestId('bpe-token-count')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Merge one step →' })).toBeDisabled();
});

test('language, keyboard tabs, concept checks, and panel state persist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('tab', { name: /Attention/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Sampling/ })).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'How do we choose the next token?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Draw next ↗' }).click();
  await page.getByRole('tab', { name: /Attention/ }).click();
  await page.getByRole('button', { name: 'No, future positions have zero weight' }).click();
  await expect(page.locator('.concept-check:visible [role="status"]')).toContainText('Exactly.');
  await page.getByRole('tab', { name: /Sampling/ }).click();
  await expect(page.getByTestId('sample-count')).toHaveText('1');
  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await expect(page.getByRole('heading', { name: '下一個 token，怎麼選？' })).toBeVisible();
});

for (const lang of ['en', 'zh-Hant'])
  for (const lab of ['attention', 'sampling', 'bpe']) {
    test(`${lang}/${lab}: accessible, no horizontal overflow, same-origin assets`, async ({
      page,
    }, testInfo) => {
      const requests: string[] = [];
      page.on('request', (request) => requests.push(request.url()));
      await page.goto(`/?lang=${lang}#${lab}`);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      const accessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(accessibility.violations).toEqual([]);
      expect(requests.every((url) => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${lang}-${lab}.png`), fullPage: true });
    });
  }
