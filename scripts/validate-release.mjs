import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';

const required = [
  'index.html', 'v6.js', 'v6.css', 'v7.js', 'v7.css', 'model-data.js',
  'assets/male-base-mesh-base_male.glb', 'manifest.json', 'sw.js', 'icon.svg',
  'README.md', 'LICENSE', 'MODEL_LICENSE.md', 'THIRD_PARTY_NOTICES.md',
  'PRIVACY.md', 'SECURITY.md', 'CITATION.cff'
];

const fail = message => { throw new Error(message); };
for (const file of required) {
  if (!statSync(file, { throwIfNoEntry: false })?.isFile()) fail(`Missing required file: ${file}`);
}

for (const file of ['v6.js', 'v7.js', 'sw.js']) {
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

const modelSource = readFileSync('model-data.js', 'utf8');
const encoded = modelSource.match(/window\.INK_ATLAS_MODEL_BASE64="([A-Za-z0-9+/=]+)";/)?.[1];
if (!encoded) fail('Could not locate embedded GLB payload');
const embedded = Buffer.from(encoded, 'base64');
const glb = readFileSync('assets/male-base-mesh-base_male.glb');
if (!embedded.equals(glb)) fail('model-data.js does not match the bundled GLB');
if (glb.toString('utf8', 0, 4) !== 'glTF') fail('Bundled model is not a GLB file');
if (glb.readUInt32LE(8) !== glb.length) fail('Bundled GLB length header is invalid');

const textFiles = required.filter(file => !['.glb'].includes(extname(file)) && file !== 'model-data.js');
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
  'https://static.makehumancommunity.org/about/license.html',
  'https://creativecommons.org/publicdomain/zero/1.0/'
]) if (!releaseText.includes(url)) fail(`Missing required attribution URL: ${url}`);

const digest = createHash('sha256').update(glb).digest('hex');
console.log(`Release validation passed: ${required.length} required files, ${inlineScripts.length} inline scripts, GLB sha256 ${digest}`);
