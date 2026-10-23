import { readFileSync, writeFileSync } from 'node:fs';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  throw new Error('Usage: node scripts/embed-model.mjs <model.glb> <model-data.js>');
}

const encoded = readFileSync(source).toString('base64');
const header = '/* Generated from the bundled CC0 GLB so the realistic model also loads from file://. */\n';
writeFileSync(destination, `${header}window.INK_ATLAS_MODEL_BASE64="${encoded}";\n`);
console.log(`Embedded ${source} in ${destination}`);
