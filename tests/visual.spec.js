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
  await expect(page.locator('#v7Outfit')).toHaveValue('none');
  await expect(page.locator('#v7Outfit option[value="none"]')).toHaveCount(1);
  await expect(page.locator('#v7Outfit option')).toHaveCount(179);
  await expect(page.locator('#v7Outfit option[value="sport"]')).toHaveCount(0);
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
  await page.locator('#v7Outfit').selectOption('asset:shirts01_cc0_toigo_keyhole_tank_top');
  await page.waitForTimeout(250);
  await expect(page.locator('#glCanvas')).toHaveScreenshot('feminine-pose-extremes.png', { maxDiffPixelRatio: .10 });
  await page.locator('#v7Calibrate').click();
  await expect(page.locator('#v7CalibrationModal')).toBeVisible();
  await page.locator('#v7CalibrationModal .v7-close').click();
  expect(errors).toEqual([]);
});

test('MakeHuman wardrobe, hair and facial hair controls render and persist', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openClean(page, 'male');
  const chosen=['shirts03_ccby_drednicolson_asymmetric_tunic_and_sash','shoes02_ccby_dressupdoc_balletflat1','gloves01_cc0_culturalibre_hero_heroine_gloves_1','hats03_cc_by_elvs_slouchy_beanie1','glasses01_cc0_ews_3d_glasses','hair01_cc0_learning_anime_hair','bodyparts05_cc0_culturalibre_faun_beard'];
  await page.locator('#v7Outfit').selectOption(`asset:${chosen[0]}`);
  await page.locator('#v7Shoes').selectOption(`asset:${chosen[1]}`);
  await page.locator('#v7Gloves').selectOption(`asset:${chosen[2]}`);
  await page.locator('#v7Hat').selectOption(`asset:${chosen[3]}`);
  await page.locator('#v7Eyewear').selectOption(`asset:${chosen[4]}`);
  await page.locator('#v7HairStyle').selectOption(`asset:${chosen[5]}`);
  await page.locator('#v7FacialHair').selectOption(`asset:${chosen[6]}`);
  await page.waitForTimeout(450);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('inkAtlas_tattoo_v1')).bodySettings);
  expect(saved.equippedAssets).toEqual(expect.arrayContaining(chosen));
  for(const legacy of ['outfit','shoes','socks','gloves','hat','eyewear','hairStyle','facialHair'])expect(saved[legacy]).toBeUndefined();
  await page.screenshot({ path: testInfo.outputPath('styled-model-render.png') });
  expect(errors).toEqual([]);
});

test('downloaded MakeHuman assets deform with the body and persist', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openClean(page, 'male');
  await expect(page.locator('#v7TopAsset option')).toHaveCount(80);
  await page.locator('#v7TopAsset').selectOption('asset:shirts01_cc0_toigo_keyhole_tank_top');
  await expect.poll(() => page.evaluate(() => window.INK_ATLAS_MEASUREMENTS.equippedAssets?.includes('shirts01_cc0_toigo_keyhole_tank_top'))).toBe(true);
  await page.locator('#abductL').fill('125');
  await page.locator('#abductR').fill('125');
  await page.waitForTimeout(300);
  const stats = await page.evaluate(() => window.InkAtlasV7Bridge.appearanceAssetStats('shirts01_cc0_toigo_keyhole_tank_top'));
  expect(stats.finite).toBe(true);
  expect(stats.vertices).toBe(823);
  expect(stats.min[0]).toBeGreaterThan(-3);
  expect(stats.max[0]).toBeLessThan(3.4);
  expect(stats.min[1]).toBeGreaterThan(-3.5);
  expect(stats.max[1]).toBeLessThan(3.6);
  const saved=await page.evaluate(() => JSON.parse(localStorage.getItem('inkAtlas_tattoo_v1')).bodySettings.equippedAssets);
  expect(saved).toContain('shirts01_cc0_toigo_keyhole_tank_top');
  expect(errors).toEqual([]);
});

test('face, hair and grooming details use the shared adaptive asset path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,'male');
  await page.locator('#v7HairStyle').selectOption('asset:hair01_cc0_learning_anime_hair');
  await page.locator('#v7FacialHair').selectOption('asset:bodyparts05_cc0_wdg_scruffy_beard');
  await page.locator('#v7EyebrowStyle').selectOption('asset:eyebrows01_cc0_mindfront_eyebrows_01');
  await page.locator('#v7EyelashStyle').selectOption('asset:eyelashes01_cc0_mindfront_eyelashes_01');
  await page.locator('#v7EyeStyle').selectOption('asset:makehuman_system_assets_cc0_high_poly');
  await page.locator('#v7FingerNailStyle').selectOption('asset:bodyparts04_cc0_wolgade_female_fingernails');
  await page.locator('#v7ToeNailStyle').selectOption({index:1});
  await page.locator('#v7NoseShape').selectOption({index:1});
  await page.locator('[data-measure="chestCm"]').fill('118');
  await page.locator('[data-measure="shoulderCm"]').fill('54');
  await page.waitForTimeout(450);
  for(const id of ['hair01_cc0_learning_anime_hair','bodyparts05_cc0_wdg_scruffy_beard','makehuman_system_assets_cc0_high_poly']){const stats=await page.evaluate(id=>window.InkAtlasV7Bridge.appearanceAssetStats(id),id);expect(stats?.finite).toBe(true);}
  await page.evaluate(()=>window.InkAtlasV7Bridge.focusBodyRegion('head'));
  await page.waitForTimeout(250);
  await page.screenshot({path:testInfo.outputPath('adaptive-grooming-render.png')});
  await expect(page.locator('#glCanvas')).toHaveScreenshot('adaptive-grooming.png',{maxDiffPixelRatio:.08});expect(errors).toEqual([]);
});

test('feminine face keeps fine features aligned with anatomy changes',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,'female');
  await page.locator('#v7EyebrowStyle').selectOption('asset:eyebrows01_cc0_mindfront_eyebrows_01');
  await page.locator('#v7EyelashStyle').selectOption('asset:eyelashes01_cc0_mindfront_eyelashes_01');
  await page.locator('#v7EyeStyle').selectOption('asset:makehuman_system_assets_cc0_high_poly');
  await page.locator('#v7NoseShape').selectOption('nose_jujube_greek_statue_nose');
  await page.locator('#v7EarShape').selectOption('ears_elvs_flap_ears_2');
  await page.locator('#v7CheekShape').selectOption('cheeks_elvs_chipmunk_cheeks_low_1');
  await page.evaluate(()=>window.InkAtlasV7Bridge.focusBodyRegion('head'));await page.waitForTimeout(350);
  for(const id of ['eyebrows01_cc0_mindfront_eyebrows_01','eyelashes01_cc0_mindfront_eyelashes_01','makehuman_system_assets_cc0_high_poly']){const stats=await page.evaluate(id=>window.InkAtlasV7Bridge.appearanceAssetStats(id),id);expect(stats?.finite).toBe(true);expect(stats?.deformationMode).toBe('stable facial feature frame');}
  await expect(page.locator('#glCanvas')).toHaveScreenshot('feminine-adaptive-face.png',{maxDiffPixelRatio:.08});expect(errors).toEqual([]);
});

for (const model of ['male','female']) test(`${model} body keeps MakeHuman assets fitted through combined shape and pose extremes`, async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,model);
  const ids=['shirts01_cc0_toigo_camisole_top','pants02_ccby_punkduck_female_tight_jeans','shoes02_ccby_punkduck_comfortable_sneakers','gloves01_cc0_toigo_gloves_long','hair02_ccby_elvs_micky_afro','glasses02_ccby_punkduck_sport_sunglasses'];
  for(const id of ids)await page.evaluate(id=>window.InkAtlasV7Bridge.equipAppearanceAsset(id),id);
  await expect.poll(()=>page.evaluate(ids=>window.InkAtlasV7Bridge.appearanceBodyMaskStats().hiddenTriangles+ids.reduce((sum,id)=>sum+(window.InkAtlasV7Bridge.appearanceAssetStats(id)?.backingTriangles||0),0),ids)).toBeGreaterThan(0);
  for(const [key,value] of Object.entries({chestCm:125,waistCm:115,hipsCm:125,bicepsCm:48,thighsCm:76,shoulderCm:57}))await page.locator(`[data-measure="${key}"]`).fill(String(value));
  if(model==='female')await page.locator('#v7BreastSize').fill('200');
  for(const [id,value] of Object.entries({abductL:145,abductR:135,forwardL:70,forwardR:-35,twistL:60,twistR:-60,elbowL:125,elbowR:110,hipL:45,hipR:-20,kneeL:110,kneeR:95}))await page.locator(`#${id}`).fill(String(value));
  await page.waitForTimeout(700);
  const stats=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,window.InkAtlasV7Bridge.appearanceAssetStats(id)])),ids);
  expect(stats.shoes02_ccby_punkduck_comfortable_sneakers.vertices).toBe(1078);
  for(const result of Object.values(stats)){expect(result.bound).toBe(true);expect(result.finite).toBe(true);expect(result.invalidVertices).toBe(0);expect(result.deformationMode).toContain('surface frame');expect(Math.max(...result.max.map(Math.abs),...result.min.map(Math.abs))).toBeLessThan(8);}
  await page.screenshot({path:testInfo.outputPath(`${model}-adaptive-assets.png`)});
  for(const id of ids)await page.evaluate(id=>window.InkAtlasV7Bridge.removeAppearanceAsset(id),id);
  await expect.poll(()=>page.evaluate(()=>window.InkAtlasV7Bridge.appearanceBodyMaskStats().hiddenTriangles)).toBe(0);expect(errors).toEqual([]);
});

test('all face-shape choices remain smooth, finite and bounded', async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,'male');
  for(const selector of ['#v7NoseShape','#v7EarShape','#v7CheekShape']){const values=await page.locator(`${selector} option`).evaluateAll(options=>options.slice(1).map(option=>option.value));for(const value of values){await page.locator(selector).selectOption(value);await expect.poll(()=>page.evaluate(id=>importedRig.anatomyMorphStats(id),value)).not.toBeNull();const result=await page.evaluate(id=>({stats:importedRig.anatomyMorphStats(id),finite:parts.every(part=>Array.from(part.positions).every(Number.isFinite))}),value);expect(result.finite).toBe(true);expect(result.stats.deformationMode).toBe('smooth anatomical field');expect(result.stats.maxDisplacement).toBeLessThan(.05);expect(result.stats.strength).toBeGreaterThan(.1);await page.locator(selector).selectOption('none');}}
  await page.locator('#v7NoseShape').selectOption('nose_elvs_bulbous_nose_1');await page.locator('#v7EarShape').selectOption('ears_elvs_flap_ears_1');await page.locator('#v7CheekShape').selectOption('cheeks_elvs_high_chubby_cheekbones_1');await page.evaluate(()=>window.InkAtlasV7Bridge.focusBodyRegion('head'));await expect(page.locator('#glCanvas')).toHaveScreenshot('bounded-face-shapes.png',{maxDiffPixelRatio:.10});expect(errors).toEqual([]);
});

test('MakeHuman pose library applies bounded limb adaptations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await openClean(page, 'male');
  await expect(page.locator('#v7PoseLibrary option')).toHaveCount(14);
  await page.locator('#v7PoseLibrary').selectOption('poses04_cc0_spreadcore_arms_up_pose_001');
  await page.locator('#v7ApplyPoseLibrary').click();
  await expect(page.locator('#abductL')).toHaveValue('127');
  await expect(page.locator('#abductR')).toHaveValue('127');
  await expect(page.locator('#elbowL')).toHaveValue('6');
  expect(await page.evaluate(() => Object.values(pose).every(Number.isFinite))).toBe(true);
});

test('both legs support hip abduction and adduction', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await openClean(page, 'male');
  await page.locator('#hipL').fill('55');
  await page.locator('#hipR').fill('-25');
  await page.locator('#kneeL').fill('45');
  await expect(page.locator('#out-hipL')).toHaveText('55°');
  await expect(page.locator('#out-hipR')).toHaveText('-25°');
  const state=await page.evaluate(()=>({pose:{...pose},controls:{...importedRig.controls},finite:parts.every(part=>Array.from(part.positions).every(Number.isFinite))}));
  expect(state.pose).toMatchObject({leftHip:55,rightHip:-25,leftKnee:45});
  expect(state.controls.leftHip).toBeGreaterThanOrEqual(0);
  expect(state.controls.rightHip).toBeGreaterThanOrEqual(0);
  expect(state.finite).toBe(true);
  await expect(page.locator('#glCanvas')).toHaveScreenshot('hip-abduction-adduction.png', { maxDiffPixelRatio: .10 });
});

test('body model switching and direct-file mode both load', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inkAtlas_body_model', 'male'); });
  await page.reload();
  await expect(page.locator('#modelStatus')).toContainText(/base mesh|vertices/, { timeout: 30_000 });
  await page.locator('#bodyModelType').selectOption('female');
  await expect(page.locator('#modelStatus')).toContainText('feminine base mesh', { timeout: 30_000 });
  await expect(page.locator('#v7Outfit')).toHaveValue('none');
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
