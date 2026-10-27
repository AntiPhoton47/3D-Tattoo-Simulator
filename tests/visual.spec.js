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
  await expect(page.locator('#v7Outfit option')).toHaveCount(22);
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
  await page.locator('#v7TopAsset').selectOption('asset:shirts01_cc0_toigo_keyhole_tank_top');
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
  await page.locator('#v7TopAsset').selectOption(`asset:${chosen[0]}`);
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
  await expect(page.locator('#v7TopAsset option')).toHaveCount(43);
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
  const beard=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('bodyparts05_cc0_wdg_scruffy_beard'));expect(beard.min[1]).toBeGreaterThan(2.25);expect(beard.max[1]).toBeLessThan(3.08);
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
  for(const id of ['eyebrows01_cc0_mindfront_eyebrows_01','eyelashes01_cc0_mindfront_eyelashes_01','makehuman_system_assets_cc0_high_poly']){const stats=await page.evaluate(id=>window.InkAtlasV7Bridge.appearanceAssetStats(id),id);expect(stats?.finite).toBe(true);expect(stats?.deformationMode).toBe('paired anatomical head frames');}
  await expect(page.locator('#glCanvas')).toHaveScreenshot('feminine-adaptive-face.png',{maxDiffPixelRatio:.08});expect(errors).toEqual([]);
});

for (const model of ['male','female']) test(`${model} body keeps MakeHuman assets fitted through combined shape and pose extremes`, async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,model);
  const baselineMask=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceBodyMaskStats().hiddenTriangles);
  const ids=['shirts01_cc0_toigo_camisole_top','pants02_ccby_punkduck_female_tight_jeans','shoes02_ccby_punkduck_comfortable_sneakers','gloves01_cc0_toigo_gloves_long','hair02_ccby_elvs_micky_afro','glasses02_ccby_punkduck_sport_sunglasses'];
  for(const id of ids)await page.evaluate(id=>window.InkAtlasV7Bridge.equipAppearanceAsset(id),id);
  await expect.poll(()=>page.evaluate(ids=>ids.every(id=>window.InkAtlasV7Bridge.appearanceAssetStats(id)?.finite===true),ids)).toBe(true);
  const dressedMask=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceBodyMaskStats());expect(dressedMask.hiddenTriangles).toBeGreaterThan(baselineMask);expect(dressedMask.hiddenTriangles).toBeLessThan(dressedMask.totalTriangles*.55);
  for(const [key,value] of Object.entries({chestCm:125,waistCm:115,hipsCm:125,bicepsCm:48,thighsCm:76,shoulderCm:57}))await page.locator(`[data-measure="${key}"]`).fill(String(value));
  if(model==='female')await page.locator('#v7BreastSize').fill('200');
  for(const [id,value] of Object.entries({abductL:145,abductR:135,forwardL:70,forwardR:-35,twistL:60,twistR:-60,elbowL:125,elbowR:110,hipL:45,hipR:-20,kneeL:110,kneeR:95}))await page.locator(`#${id}`).fill(String(value));
  await page.waitForTimeout(700);
  const stats=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,window.InkAtlasV7Bridge.appearanceAssetStats(id)])),ids);
  expect(stats.shoes02_ccby_punkduck_comfortable_sneakers.vertices).toBe(1078);
  for(const [id,result] of Object.entries(stats)){const glasses=id==='glasses02_ccby_punkduck_sport_sunglasses',topology=['shoes02_ccby_punkduck_comfortable_sneakers','gloves01_cc0_toigo_gloves_long'].includes(id);expect(result.bound).toBe(true);expect(result.finite).toBe(true);expect(result.invalidVertices).toBe(0);expect(result.deformationMode).toContain(glasses?'head frame':topology?'body displacement field':'MakeHuman proxy binding');expect(Math.max(...result.max.map(Math.abs),...result.min.map(Math.abs))).toBeLessThan(8);if(result.maxClearanceCorrection!==undefined)expect(result.maxClearanceCorrection).toBeLessThanOrEqual(.0251);}
  await page.screenshot({path:testInfo.outputPath(`${model}-adaptive-assets.png`)});
  for(const id of ids)await page.evaluate(id=>window.InkAtlasV7Bridge.removeAppearanceAsset(id),id);
  await expect.poll(()=>page.evaluate(()=>window.InkAtlasV7Bridge.appearanceBodyMaskStats().hiddenTriangles)).toBe(baselineMask);expect(errors).toEqual([]);
});

test('all face-shape choices remain smooth, finite and bounded', async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,'male');
  for(const selector of ['#v7NoseShape','#v7EarShape','#v7CheekShape']){const values=await page.locator(`${selector} option`).evaluateAll(options=>options.slice(1).map(option=>option.value));for(const value of values){await page.locator(selector).selectOption(value);await expect.poll(()=>page.evaluate(id=>importedRig.anatomyMorphStats(id),value)).not.toBeNull();const result=await page.evaluate(id=>({stats:importedRig.anatomyMorphStats(id),finite:parts.every(part=>Array.from(part.positions).every(Number.isFinite))}),value);expect(result.finite).toBe(true);expect(result.stats.deformationMode).toBe('MakeHuman target surface transfer');expect(result.stats.maxDisplacement).toBeLessThan(.08);expect(result.stats.strength).toBeGreaterThan(.1);await page.locator(selector).selectOption('none');}}
  await page.locator('#v7NoseShape').selectOption('nose_elvs_bulbous_nose_1');await page.locator('#v7EarShape').selectOption('ears_elvs_flap_ears_1');await page.locator('#v7CheekShape').selectOption('cheeks_elvs_high_chubby_cheekbones_1');await page.evaluate(()=>window.InkAtlasV7Bridge.focusBodyRegion('head'));await expect(page.locator('#glCanvas')).toHaveScreenshot('bounded-face-shapes.png',{maxDiffPixelRatio:.10});expect(errors).toEqual([]);
});

test('head appearance controls are continuous, rigid where required, and free of implementation copy',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');await openClean(page,'male');
  expect(await page.evaluate(()=>new Set(parts).size===parts.length)).toBe(true);
  await expect(page.locator('#v7LipTone')).toBeVisible();await page.locator('#v7LipTone').fill('0');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.lipColor)).toBe('#623b3d');await page.locator('#v7LipTone').fill('100');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.lipColor)).toBe('#efb7ae');
  await expect(page.locator('#v7FacialHairTone')).toBeVisible();await page.locator('#v7FacialHairTone').fill('0');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.facialHairColor)).toBe('#171412');await page.locator('#v7FacialHairTone').fill('75');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.facialHairColor)).toBe('#e4cb94');await page.locator('#v7FacialHairTone').fill('100');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.facialHairColor)).toBe('#f2f0ea');
  await expect(page.locator('#v7EyebrowTone')).toBeVisible();await page.locator('#v7EyebrowTone').fill('75');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.eyebrowColor)).toBe('#e4cb94');await page.locator('#v7EyebrowTone').fill('100');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.eyebrowColor)).toBe('#f2f0ea');
  await expect(page.locator('#v7EyelashTone')).toBeVisible();await page.locator('#v7EyelashTone').fill('0');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.eyelashColor)).toBe('#171412');await page.locator('#v7EyelashTone').fill('75');expect(await page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.eyelashColor)).toBe('#e4cb94');
  await page.evaluate(id=>window.InkAtlasV7Bridge.equipAppearanceAsset(id),'hats03_cc_by_elvs_male_trilby_hat');await expect.poll(()=>page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('hats03_cc_by_elvs_male_trilby_hat')?.finite)).toBe(true);const hat=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('hats03_cc_by_elvs_male_trilby_hat'));expect(hat.deformationMode).toBe('rigid head fit');const current=hat.max.map((value,index)=>value-hat.min[index]),rest=hat.restMax.map((value,index)=>value-hat.restMin[index]),ratios=current.map((value,index)=>value/rest[index]);expect(Math.max(...ratios)-Math.min(...ratios)).toBeLessThan(.002);
  await page.evaluate(id=>window.InkAtlasV7Bridge.removeAppearanceAsset(id),'hats03_cc_by_elvs_male_trilby_hat');await page.evaluate(id=>window.InkAtlasV7Bridge.equipAppearanceAsset(id),'hats03_cc_by_mindfront_patrol_cap');await expect.poll(()=>page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('hats03_cc_by_mindfront_patrol_cap')?.min[1])).toBeGreaterThan(3.04);
  await page.evaluate(id=>window.InkAtlasV7Bridge.removeAppearanceAsset(id),'hats03_cc_by_mindfront_patrol_cap');await page.locator('#v7EyeStyle').selectOption('asset:makehuman_system_assets_cc0_high_poly');await page.locator('#v7EyelashStyle').selectOption('asset:eyelashes01_cc0_mindfront_eyelashes_01');await page.locator('#v7EyeColor').fill('#2866ba');await page.evaluate(()=>window.InkAtlasV7Bridge.focusBodyRegion('head'));await page.waitForTimeout(300);await expect(page.locator('#glCanvas')).toHaveScreenshot('iris-only-colour-and-lashes.png',{maxDiffPixelRatio:.08});
  const copy=await page.locator('body').innerText();expect(copy).not.toMatch(/corrective shoulder skinning|legacy interface|previous app version|as requested/i);
});

for(const model of ['male','female'])test(`${model} head assets keep authored shape and anatomical contact`,async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,model);
  await page.locator('#v7NoseShape').selectOption({index:2});await page.locator('#v7EarShape').selectOption({index:2});await page.locator('#v7CheekShape').selectOption({index:2});
  await page.locator('#v7HairStyle').selectOption('asset:hair02_ccby_elvs_ashley_may_hair');await page.locator('#v7FacialHair').selectOption('asset:bodyparts05_cc0_grinsegold_beard_sigmund_wip');await page.locator('#v7EyeStyle').selectOption('asset:makehuman_system_assets_cc0_high_poly');await page.locator('#v7EyelashStyle').selectOption('asset:eyelashes01_cc0_mindfront_eyelashes_01');await page.evaluate(()=>window.InkAtlasV7Bridge.focusBodyRegion('head'));await page.waitForTimeout(350);
  const beard=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('bodyparts05_cc0_grinsegold_beard_sigmund_wip'));expect(beard.deformationMode).toContain('topology-regularized landmark face fit');expect(beard.finite).toBe(true);await expect(page.locator('#glCanvas')).toHaveScreenshot(`${model}-adaptive-head-grooming.png`,{maxDiffPixelRatio:.08});
  await page.locator('#v7Hat').selectOption('asset:hats03_cc_by_elvs_male_trilby_hat');await page.waitForTimeout(250);const combinedHat=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('hats03_cc_by_elvs_male_trilby_hat'));expect(combinedHat.deformationMode).toBe('rigid head fit');expect(combinedHat.maxClearanceCorrection).toBeGreaterThan(.22);expect(combinedHat.maxClearanceCorrection).toBeLessThanOrEqual(.2601);await expect(page.locator('#glCanvas')).toHaveScreenshot(`${model}-combined-hair-beard-trilby.png`,{maxDiffPixelRatio:.08});
  await page.locator('#v7HairStyle').selectOption('none');await page.locator('#v7FacialHair').selectOption('none');await page.locator('#v7Hat').selectOption('asset:hats03_cc_by_mindfront_patrol_cap');await expect.poll(()=>page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('hats03_cc_by_mindfront_patrol_cap')?.deformationMode)).toBe('rigid head fit');const hat=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceAssetStats('hats03_cc_by_mindfront_patrol_cap'));expect(hat.finite).toBe(true);await expect(page.locator('#glCanvas')).toHaveScreenshot(`${model}-rigid-hat-contact.png`,{maxDiffPixelRatio:.08});expect(errors).toEqual([]);
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

test('garment masking preserves open edges and uses authored body coverage',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,'female');
  const baseline=await page.evaluate(()=>InkAtlasV7Bridge.appearanceBodyMaskStats().hiddenTriangles);
  await page.locator('#v7TopAsset').selectOption('asset:shirts02_ccby_punkduck_lace_up_blouse');await expect.poll(()=>page.evaluate(()=>InkAtlasV7Bridge.appearanceAssetStats('shirts02_ccby_punkduck_lace_up_blouse')?.finite)).toBe(true);
  const blouse=await page.evaluate(()=>({mesh:InkAtlasV7Bridge.appearanceAssetStats('shirts02_ccby_punkduck_lace_up_blouse'),mask:InkAtlasV7Bridge.appearanceBodyMaskStats()}));expect(blouse.mesh.deformationMode).toContain('topology regularization');expect(blouse.mask.hiddenTriangles).toBe(baseline);
  await page.locator('#v7BottomAsset').selectOption('asset:pants02_ccby_punkduck_female_tight_jeans');await expect.poll(()=>page.evaluate(()=>InkAtlasV7Bridge.appearanceBodyMaskStats().hiddenTriangles)).toBeGreaterThan(baseline);expect(errors).toEqual([]);
});

test('wardrobe groups, native nail registration and cached accessory fitting stay coherent', async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop');const errors=[];page.on('pageerror',error=>errors.push(error.message));await openClean(page,'male');
  await expect(page.locator('#tatCount')).toHaveText('0 planned');await expect(page.locator('#v7Outfit option')).toHaveCount(22);
  for(const selector of ['#v7BraAsset','#v7UnderwearAsset','#v7SocksAsset','#v7ArmSleevesAsset','#v7OtherUnderlayerAsset']){await expect(page.locator(selector)).toBeVisible();expect(await page.locator(`${selector} option`).count()).toBeGreaterThan(1);}
  await page.locator('#v7Outfit').selectOption('outfit:0');await expect.poll(()=>page.evaluate(()=>window.INK_ATLAS_MEASUREMENTS.equippedAssets.includes('pants01_cc0_cortu_cargo_pants'))).toBe(true);
  await page.locator('#v7FingerNailStyle').selectOption('asset:bodyparts04_cc0_wolgade_female_fingernails');await page.locator('#v7ToeNailStyle').selectOption('asset:bodyparts04_cc0_mindfront_nails_toes_01');
  await page.locator('#v7Gloves').selectOption('asset:gloves01_cc0_culturalibre_hero_heroine_gloves_1');await page.locator('#v7Shoes').selectOption('asset:shoes02_ccby_dressupdoc_balletflat1');await page.waitForTimeout(450);
  const stats=await page.evaluate(()=>({finger:InkAtlasV7Bridge.appearanceAssetStats('bodyparts04_cc0_wolgade_female_fingernails'),toe:InkAtlasV7Bridge.appearanceAssetStats('bodyparts04_cc0_mindfront_nails_toes_01'),gloves:InkAtlasV7Bridge.appearanceAssetStats('gloves01_cc0_culturalibre_hero_heroine_gloves_1'),shoes:InkAtlasV7Bridge.appearanceAssetStats('shoes02_ccby_dressupdoc_balletflat1'),mask:InkAtlasV7Bridge.appearanceBodyMaskStats()}));
  expect(stats.finger.deformationMode).toContain('native nail-surface registration');expect(stats.finger.detailRegistration.matched).toBe(10);expect(stats.finger.detailRegistration.targetMatched).toBe(10);expect(stats.toe.detailRegistration.matched).toBe(20);expect(stats.toe.detailRegistration.sourceGroups).toBe(10);expect(stats.toe.detailRegistration.targetMatched).toBe(10);expect(stats.gloves.deformationMode).toContain('per-hand contact alignment');expect(stats.shoes.deformationMode).toContain('per-foot contact alignment');for(const item of [stats.finger,stats.toe,stats.gloves,stats.shoes])expect(item.finite).toBe(true);expect(stats.mask.hiddenTriangles).toBeGreaterThan(0);expect(stats.mask.hiddenTriangles).toBeLessThan(stats.mask.totalTriangles*.55);
  const before=await page.evaluate(()=>InkAtlasV7Bridge.appearancePerformanceStats());await page.evaluate(()=>{for(let index=0;index<16;index++)requestDraw();});await page.waitForTimeout(150);const after=await page.evaluate(()=>InkAtlasV7Bridge.appearancePerformanceStats());expect(after.refits).toBe(before.refits);expect(after.fitRevision).toBe(before.fitRevision);
  await page.locator('#hipL').fill('28');await expect.poll(()=>page.evaluate(()=>InkAtlasV7Bridge.appearancePerformanceStats().fitRevision)).toBeGreaterThan(before.fitRevision);expect(errors).toEqual([]);
});

test('body model switching and direct-file mode both load', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inkAtlas_body_model', 'male'); });
  await page.reload();
  await expect(page.locator('#modelStatus')).toContainText(/base mesh|vertices/, { timeout: 30_000 });
  await page.locator('#bodyModelType').selectOption('female');
  await expect(page.locator('#modelStatus')).toContainText('Anatomical body', { timeout: 30_000 });
  await expect(page.locator('#bodyModelType')).toHaveValue('female');
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
