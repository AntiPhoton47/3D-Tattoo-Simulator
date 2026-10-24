const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

async function openClean(page, model = 'male') {
  await page.addInitScript(selected => {
    localStorage.clear();
    localStorage.setItem('inkAtlas_body_model', selected);
  }, model);
  await page.goto('/');
  await expect(page.locator('#modelStatus')).toContainText(/base mesh|vertices/, { timeout: 30_000 });
}

test('desktop studio remains collision-free', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openClean(page, 'male');
  await expect(page.locator('#glCanvas')).toBeVisible();
  await expect(page.locator('.v7-toolbar')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop-model-render.png') });
  await expect(page).toHaveScreenshot('desktop-studio.png', { mask: [page.locator('#glCanvas')] });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('feminine model supports covered and non-explicit unclothed planning', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await openClean(page, 'female');
  await expect(page.locator('#bodyModelType')).toHaveValue('female');
  await expect(page.locator('#v7Outfit')).toHaveValue('sport');
  await expect(page.locator('#v7Outfit option[value="none"]')).toHaveCount(1);
  await page.locator('#v7Outfit').selectOption('none');
  await expect(page.locator('#v7Outfit')).toHaveValue('none');
  await page.locator('#v7BreastSize').fill('0');
  expect(await page.evaluate(() => window.INK_ATLAS_MEASUREMENTS.breastSize)).toBe(0);
  await page.locator('#v7BreastSize').fill('200');
  await expect(page.locator('#v7BreastSizeOut')).toHaveValue('200');
  expect(await page.evaluate(() => window.INK_ATLAS_MEASUREMENTS.breastSize)).toBe(200);
  await expect(page.locator('#glCanvas')).toHaveScreenshot('feminine-max-volume.png', { maxDiffPixelRatio: .10 });
  await page.screenshot({ path: testInfo.outputPath('feminine-covered-render.png') });
  await expect(page).toHaveScreenshot('desktop-feminine-covered.png', { mask: [page.locator('#glCanvas')] });
});

test('pose extremes keep the corrected shoulder surface stable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openClean(page, 'female');
  for (const id of ['#abductL', '#abductR']) await page.locator(id).fill('150');
  await page.locator('#forwardL').fill('58');
  await page.locator('#forwardR').fill('-35');
  await page.locator('#twistL').fill('45');
  await page.locator('#twistR').fill('-45');
  for (const id of ['#elbowL', '#elbowR']) await page.locator(id).fill('90');
  await page.locator('#v7Outfit').selectOption('tee_shorts');
  await page.waitForTimeout(250);
  await expect(page.locator('#glCanvas')).toHaveScreenshot('feminine-pose-extremes.png', { maxDiffPixelRatio: .10 });
  await page.locator('#v7Calibrate').click();
  await expect(page.locator('#v7CalibrationModal')).toBeVisible();
  await page.locator('#v7CalibrationModal .v7-close').click();
  expect(errors).toEqual([]);
});

test('wardrobe, hair and facial hair controls render and persist', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openClean(page, 'male');
  await page.locator('#v7Outfit').selectOption('jacket_jeans');
  await page.locator('#v7Shoes').selectOption('boots');
  await page.locator('#v7Socks').selectOption('crew');
  await page.locator('#v7Gloves').selectOption('long');
  await page.locator('#v7Hat').selectOption('cap');
  await page.locator('#v7Eyewear').selectOption('square');
  await page.locator('#v7HairStyle').selectOption('crop');
  await page.locator('#v7FacialHair').selectOption('full');
  await page.waitForTimeout(450);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('inkAtlas_tattoo_v1')).bodySettings);
  expect(saved).toMatchObject({outfit:'jacket_jeans',shoes:'boots',socks:'crew',gloves:'long',hat:'cap',eyewear:'square',hairStyle:'crop',facialHair:'full'});
  await page.screenshot({ path: testInfo.outputPath('styled-model-render.png') });
  expect(errors).toEqual([]);
});

test('body model switching and direct-file mode both load', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inkAtlas_body_model', 'male'); });
  await page.reload();
  await expect(page.locator('#modelStatus')).toContainText(/base mesh|vertices/, { timeout: 30_000 });
  await page.locator('#bodyModelType').selectOption('female');
  await expect(page.locator('#modelStatus')).toContainText('feminine base mesh', { timeout: 30_000 });
  await expect(page.locator('#v7Outfit')).toHaveValue('sport');
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await expect(page.locator('#modelStatus')).toContainText(/base mesh|vertices/, { timeout: 30_000 });
  await expect(page.locator('#glCanvas')).toBeVisible();
});

test('mobile shell fits without menu collisions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await openClean(page, 'male');
  await expect(page.locator('.mobile-nav')).toBeVisible();
  await expect(page.locator('#glCanvas')).toBeVisible();
  const layout = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
    const top = rect('.top'), toolbar = rect('.v7-toolbar'), canvas = rect('.canvas-wrap'), nav = rect('.mobile-nav');
    return { overflow: document.documentElement.scrollWidth - innerWidth, topBottom: top?.bottom, toolbarTop: toolbar?.top, toolbarBottom: toolbar?.bottom, canvasTop: canvas?.top, canvasBottom: canvas?.bottom, navTop: nav?.top };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.toolbarTop).toBeGreaterThanOrEqual(layout.topBottom - 1);
  expect(layout.canvasTop).toBeGreaterThanOrEqual(layout.toolbarBottom - 1);
  expect(layout.navTop).toBeGreaterThanOrEqual(layout.canvasBottom - 2);
  await page.screenshot({ path: testInfo.outputPath('mobile-model-render.png') });
  await expect(page).toHaveScreenshot('mobile-studio.png', { mask: [page.locator('#glCanvas')] });
});
