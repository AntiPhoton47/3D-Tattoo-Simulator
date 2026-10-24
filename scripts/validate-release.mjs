import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { runInNewContext } from 'node:vm';

const required = [
  'index.html', 'v6.js', 'v6.css', 'v7.js', 'v7.css', 'model-data.js', 'female-model-data.js', 'appearance-catalog.js', 'base-vertex-map.js', 'anatomy-targets.js', 'pose-presets.js',
  'assets/male-base-mesh-base_male.glb', 'assets/female-base-mesh-base_female.glb', 'manifest.json', 'sw.js', 'icon.svg',
  'README.md', 'LICENSE', 'MODEL_LICENSE.md', 'THIRD_PARTY_NOTICES.md',
  'PRIVACY.md', 'SECURITY.md', 'CITATION.cff'
];

const fail = message => { throw new Error(message); };
for (const file of required) {
  if (!statSync(file, { throwIfNoEntry: false })?.isFile()) fail(`Missing required file: ${file}`);
}

for (const file of ['appearance-catalog.js', 'base-vertex-map.js', 'anatomy-targets.js', 'pose-presets.js', 'v6.js', 'v7.js', 'sw.js', 'playwright.config.js', 'tests/visual.spec.js']) {
  try { new Function(readFileSync(file, 'utf8')); }
  catch (error) { fail(`${file} does not parse: ${error.message}`); }
}

const html = readFileSync('index.html', 'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(source => source.trim());
for (const [index, source] of inlineScripts.entries()) {
  try { new Function(source); }
  catch (error) { fail(`Inline script ${index + 1} does not parse: ${error.message}`); }
}

if (/<script[^>]+src=["']https?:/i.test(html)) fail('Remote executable script found in index.html');
if (/data:image\/(?:png|jpe?g|webp);base64/i.test(html)) fail('Embedded raster reference image found in index.html');
if (!html.includes('function normalizeImportedAsset')) fail('Imported custom artwork is missing its local-data guard');

const starterLibrary = html.match(/const ASSETS=\[([\s\S]*?)\]\.map/)?.[1] || '';
const starterIds = [...starterLibrary.matchAll(/\['([a-z0-9_]+)'/g)].map(match => match[1]);
if (starterIds.length < 20) fail(`Starter library is unexpectedly small: ${starterIds.length} assets`);
for (const category of ['Botanical', 'Animals', 'Nature', 'Traditional', 'Geometric', 'Minimal']) {
  if (!starterLibrary.includes(`'${category}'`)) fail(`Missing generic starter category: ${category}`);
}
for (const legacyName of ['Anubis', 'Cerberus', 'Eye of Horus', 'Wigner', 'Hadamard', 'Contextuality', 'Mach–Zehnder']) {
  if (starterLibrary.includes(legacyName)) fail(`Legacy starter artwork remains in the library: ${legacyName}`);
}

function validateModel(payloadFile, glbFile) {
  const modelSource = readFileSync(payloadFile, 'utf8');
  const encoded = modelSource.match(/window\.INK_ATLAS_MODEL_BASE64="([A-Za-z0-9+/=]+)";/)?.[1];
  if (!encoded) fail(`Could not locate embedded GLB payload in ${payloadFile}`);
  const embedded = Buffer.from(encoded, 'base64'), glb = readFileSync(glbFile);
  if (!embedded.equals(glb)) fail(`${payloadFile} does not match ${glbFile}`);
  if (glb.toString('utf8', 0, 4) !== 'glTF') fail(`${glbFile} is not a GLB file`);
  if (glb.readUInt32LE(8) !== glb.length) fail(`${glbFile} length header is invalid`);
  return glb;
}
const glb = validateModel('model-data.js', 'assets/male-base-mesh-base_male.glb');
const femaleGlb = validateModel('female-model-data.js', 'assets/female-base-mesh-base_female.glb');

const generatedScope = { window:{} };
runInNewContext(readFileSync('appearance-catalog.js','utf8'), generatedScope);
runInNewContext(readFileSync('base-vertex-map.js','utf8'), generatedScope);
runInNewContext(readFileSync('anatomy-targets.js','utf8'), generatedScope);
runInNewContext(readFileSync('pose-presets.js','utf8'), generatedScope);
const appearanceCatalog = generatedScope.window.INK_ATLAS_APPEARANCE_CATALOG || [], anatomyTargets=generatedScope.window.INK_ATLAS_ANATOMY_LIBRARY||[], posePresets = generatedScope.window.INK_ATLAS_POSE_PRESETS || [];
if (appearanceCatalog.length < 360) fail(`Expanded appearance library is unexpectedly small: ${appearanceCatalog.length}`);
if (appearanceCatalog.filter(item=>item.bound).length < 360) fail('Too many expanded appearance assets lack MakeHuman surface bindings');
if (appearanceCatalog.filter(item=>item.textured).length < 340) fail('Expanded appearance materials or textures are unexpectedly incomplete');
if (anatomyTargets.length < 28) fail(`Anatomy target library is unexpectedly small: ${anatomyTargets.length}`);
if (posePresets.length < 110) fail(`MakeHuman pose library is unexpectedly small: ${posePresets.length}`);
if(generatedScope.window.INK_ATLAS_BASE_VERTEX_MAPS?.count!==19158)fail('Canonical hm08 vertex map is missing or incomplete');
let lazyBytes = 0, textureBytes=0;
for (const item of appearanceCatalog) {
  if (!item.id || !item.name || !item.category || !item.author || !item.license || !item.file) fail(`Incomplete appearance catalog item: ${JSON.stringify(item)}`);
  const stats=statSync(item.file,{throwIfNoEntry:false});if(!stats?.isFile())fail(`Missing lazy appearance payload: ${item.file}`);lazyBytes+=stats.size;if(stats.size>15_000_000)fail(`Appearance payload exceeds per-item budget: ${item.file}`);
  if(item.textured){const source=readFileSync(item.file,'utf8'),texture=source.match(/"texture":"([^"]+)"/)?.[1],textureStats=texture&&statSync(texture,{throwIfNoEntry:false});if(!textureStats?.isFile())fail(`Missing appearance texture for ${item.id}`);textureBytes+=textureStats.size;if(textureStats.size>2_000_000)fail(`Appearance texture exceeds per-item budget: ${texture}`);}
}
if(lazyBytes>130_000_000)fail(`Lazy appearance geometry exceeds release budget: ${lazyBytes} bytes`);
if(textureBytes>120_000_000)fail(`Lazy appearance textures exceed release budget: ${textureBytes} bytes`);
if(!readFileSync('sw.js','utf8').includes('appearance-catalog.js')||!readFileSync('sw.js','utf8').includes('base-vertex-map.js')||!readFileSync('sw.js','utf8').includes('anatomy-targets.js')||!readFileSync('sw.js','utf8').includes('pose-presets.js'))fail('Service worker omits generated library indexes');

const textFiles = required.filter(file => !['.glb'].includes(extname(file)) && !['model-data.js','female-model-data.js'].includes(file));
const releaseText = textFiles.map(file => readFileSync(file, 'utf8')).join('\n');
const forbidden = [
  /\/Users\//i, /\bmunga\b/i, /\bPhilip\b/i, /LeMaitre/i,
  /chatgpt\.com\/share/i, /sk-[A-Za-z0-9]{16,}/,
  /your reference/i, /your sample/i, /Darmok/i, /Klingon/i,
  /Obsidian Order/i, /N[’']wah/i
];
for (const pattern of forbidden) if (pattern.test(releaseText)) fail(`Release text matched forbidden pattern: ${pattern}`);

for (const url of [
  'https://www.innerscene.com/tools/library/3d-parts/male-base-mesh-3d-person-rigged-a-pose-380e6d89',
  'https://www.innerscene.com/tools/library/3d-parts/female-base-mesh-3d-person-rigged-a-pose-dba97ed5',
  'https://static.makehumancommunity.org/about/license.html',
  'https://creativecommons.org/publicdomain/zero/1.0/'
]) if (!releaseText.includes(url)) fail(`Missing required attribution URL: ${url}`);

const digest = createHash('sha256').update(glb).digest('hex');
const femaleDigest = createHash('sha256').update(femaleGlb).digest('hex');
console.log(`Release validation passed: ${required.length} required files, ${inlineScripts.length} inline scripts, ${appearanceCatalog.length} appearance assets (${lazyBytes} geometry bytes, ${textureBytes} texture bytes), ${anatomyTargets.length} anatomy targets, ${posePresets.length} poses, male GLB ${digest}, female GLB ${femaleDigest}`);
