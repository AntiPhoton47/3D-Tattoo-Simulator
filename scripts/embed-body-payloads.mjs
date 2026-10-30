import { readFileSync, writeFileSync } from 'node:fs';

const indexFile = 'index.html';
const startMarker = '<!-- INK_ATLAS_EMBEDDED_BODY_PAYLOADS_START -->';
const endMarker = '<!-- INK_ATLAS_EMBEDDED_BODY_PAYLOADS_END -->';
const payload = file => {
  const source = readFileSync(file, 'utf8');
  const encoded = source.match(/window\.INK_ATLAS_MODEL_BASE64="([A-Za-z0-9+/=]+)";/)?.[1];
  if (!encoded) throw new Error(`Could not extract the body payload from ${file}`);
  return encoded;
};

const male = payload('model-data.js');
const female = payload('female-model-data.js');
let html = readFileSync(indexFile, 'utf8');
const embedded = `${startMarker}\n<script>\nwindow.INK_ATLAS_BODY_PAYLOADS={male:"${male}",female:"${female}"};\nwindow.INK_ATLAS_MODEL_BASE64=window.INK_ATLAS_BODY_PAYLOADS[window.INK_ATLAS_SELECTED_BODY_MODEL];\n</script>\n${endMarker}`;

if (html.includes(startMarker) && html.includes(endMarker)) {
  html = html.replace(new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`), embedded);
} else {
  html = html.replace(/<script src="model-data\.js\?v=[^"]+"><\/script>[\s\S]*?window\.INK_ATLAS_MODEL_BASE64=window\.INK_ATLAS_BODY_PAYLOADS\[window\.INK_ATLAS_SELECTED_BODY_MODEL\];\s*<\/script>/, embedded);
}
if (!html.includes(embedded)) throw new Error('Could not install the embedded body payload block');
writeFileSync(indexFile, html);
console.log(`Embedded ${male.length.toLocaleString()} male and ${female.length.toLocaleString()} female payload characters in ${indexFile}`);
