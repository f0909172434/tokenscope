import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const lab of ['attention', 'sampling', 'bpe']) {
  test(`${lab}: export, reload, import and export reproduce computed data`, async ({ page }) => {
    await page.goto(`/?lang=en#${lab}`);
    if (lab === 'attention') {
      await page.getByRole('switch', { name: /Perturb the last V/ }).check();
      await page.getByRole('switch', { name: /Causal mask/ }).uncheck();
    } else if (lab === 'sampling') {
      await page.getByLabel('Random seed').fill('567');
      await page.getByRole('button', { name: 'Run 1,000 draws' }).click();
    } else {
      await page.getByRole('button', { name: 'Traditional Chinese', exact: true }).click();
      await page.getByRole('button', { name: 'Merge one step →' }).click();
      await page.getByRole('button', { name: 'Merge one step →' }).click();
    }
    const beforePromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export experiment JSON' }).click();
    const before = await beforePromise,
      path = (await before.path())!;
    const original = JSON.parse(await readFile(path, 'utf8'));
    await page.goto('/?lang=en#attention');
    await page.getByLabel('Choose experiment JSON').setInputFiles(path);
    await expect(page.getByRole('status')).toHaveText('Controls restored and results recomputed.');
    await expect(
      page.getByRole('tab', { name: new RegExp(lab === 'bpe' ? 'BPE' : lab, 'i') }),
    ).toHaveAttribute('aria-selected', 'true');
    const afterPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export experiment JSON' }).click();
    const after = await afterPromise;
    expect(JSON.parse(await readFile((await after.path())!, 'utf8'))).toEqual(original);
  });
}

test('invalid imports preserve the current experiment and can be retried', async ({ page }) => {
  await page.goto('/?lang=zh-Hant#attention');
  const original = await page.getByTestId('attention-output').textContent();
  await page.getByLabel('選擇實驗 JSON').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":99}'),
  });
  await expect(page.getByRole('alert')).toContainText('原實驗保持不變');
  await expect(page.getByTestId('attention-output')).toHaveText(original!);
  await page.getByLabel('選擇實驗 JSON').setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(1_000_001, ' '),
  });
  await expect(page.getByRole('alert')).toContainText('上限 1 MB');
  await expect(page.getByTestId('attention-output')).toHaveText(original!);
});
