import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';

const append=process.argv.includes('--append'),downloads=process.argv.slice(2).find(value=>!value.startsWith('--'));
if (!downloads) throw new Error('Usage: node scripts/build-makehuman-library.mjs <folder-containing-MakeHuman-zips> [--append]');

const packPattern = /^(bodyparts0[456]|dress0[12]|eyebrows01|eyelashes01|glasses0[12]|gloves01|hair0[12]|hats03|jewelry0[12]|pants0[12]|shirts0[123]|shoes0[123]|skirts0[12]|underwear0[1234])(?:_cc0|_ccby|_cc-by)\.zip$|^makehuman_system_assets_cc0\.zip$/i;
const categoryFor = (name,entry,assetName) => {
  if(/^makehuman_system/i.test(name)&&!/^eyes\//i.test(entry))return null;
  if(/^eyes\//i.test(entry))return 'Eyes';if(/^eyebrows/i.test(name))return 'Eyebrows';if(/^eyelashes/i.test(name))return 'Eyelashes';
  if(/^bodyparts/i.test(name)){if(/toe/i.test(assetName)&&/nail/i.test(assetName))return 'Toe nails';if(/(?:finger)?nails?/i.test(assetName))return 'Finger nails';if(/beard|moustache|mustache/i.test(assetName))return 'Facial hair';return 'Body details';}
  if(/^jewelry/i.test(name)){if(/anklet/i.test(assetName))return 'Body accessories';if(/ring|band/i.test(assetName)&&!/ear|nose|septum|navel|belly/i.test(assetName))return 'Rings';if(/bracelet|bangle|wrist/i.test(assetName))return 'Wrist accessories';if(/necklace|choker|collar|medal/i.test(assetName))return 'Necklaces';return 'Body accessories';}
  return ({
  dress: 'Dresses', glasses: 'Eyewear', gloves: 'Gloves', hair: 'Hair', hats: 'Hats',
  pants: 'Bottoms', shirts: 'Tops', shoes: 'Shoes', skirts: 'Skirts', underwear: 'Underlayers'
})[name.match(/^[a-z]+/i)?.[0].toLowerCase()] || 'Accessories';};
const clean = value => String(value || '').trim();
const normal = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
const canonicalScale = 6.88 / (8.4967 - -8.4488);
const humanize = value => clean(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([A-Za-z])(\d)/g,'$1 $2').replace(/(\d)([A-Za-z])/g,'$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const nameAliases=new Map(Object.entries({
  '50supdo1':'Updo','animehair':'Anime Hair','blondwithheadband':'Blonde With Headband','cornrowsofelv5':'Cornrows','doublemhbraid':'Double Braid','fhair01':'Layered Hair','frenchbraid1mh01':'French Braid','grumphair':'Tousled Hair','beard1longscruffy3':'Long Scruffy Beard','beardsigmund':'Sigmund Beard','beardviking':'Viking Beard','lowpoly':'Low Poly Eyes'
}));
const cleanName=(value,author='',category='')=>{
  const original=clean(value),alias=nameAliases.get(normal(original));if(alias)return alias;
  let name=humanize(original).replace(/\b(?:male|female|mens?|ladies|womens?)\b/ig,'').replace(/^\s*[FM]\s+/,'').replace(/\b(?:Elvs?|DUDoc|Mindfront|Mind|Cortu|Toigo|Punkduck|Rehmanpolanski)\b/ig,'').replace(/\bMh\b/ig,'').replace(/\s+/g,' ').trim();
  const authorToken=author.split(/\s+/)[0]?.replace(/[^a-z0-9]/ig,'');if(authorToken)name=name.replace(new RegExp(`^${authorToken}\\s+`,'i'),'');
  name=name.replace(/\bTshirt\b/ig,'T-shirt').replace(/\bWifebeater\b/ig,'Tank Top').replace(/\bLongscruffy\b/ig,'Long Scruffy').replace(/\bDiscotop\b/ig,'Disco Top').replace(/\bLusekofta\b/ig,'Norwegian Sweater').replace(/\s+/g,' ').trim();
  name=name.replace(/50\s*Supdo/i,'Updo').replace(/Daisyhair/i,'Daisy').replace(/Elvscurly Bob/i,'Curly Bob').replace(/Grumphair/i,'Tousled Hair').replace(/Hippyhair/i,'Hippie Hair').replace(/Inverted Curlybob/i,'Inverted Curly Bob').replace(/Junglebookhair/i,'Jungle Book Hair').replace(/Katherinehair/i,'Katherine').replace(/Laracroft/i,'Lara Croft').replace(/Thejournalist/i,'Journalist').replace(/Witchybob/i,'Witchy Bob').replace(/Mhbraidfr/i,'French Braid').replace(/Braidbun/i,'Braid Bun');
  name=name.replace(/Ladieshoodiedown/i,'Hoodie').replace(/Ladiestank/i,'Tank Top').replace(/\bLady\s+/i,'').replace(/Hero Heroine/i,'Costume').replace(/Heroine/i,'Costume').replace(/\bHero\s+/i,'Costume ').replace(/Offshoulder/ig,'Off-shoulder').replace(/Peasantblouse/ig,'Peasant Blouse').replace(/Fashiondress/ig,'Fashion Dress').replace(/Fringedress/ig,'Fringe Dress').replace(/Halterdress/ig,'Halter Dress').replace(/Partydress/ig,'Party Dress').replace(/Goddessdress/ig,'Goddess Dress').replace(/Hippydress/ig,'Hippie Dress').replace(/Elephantpant/ig,'Elephant Pants').replace(/Discopant/ig,'Disco Pants').replace(/Flatshoe/ig,'Flat Shoe').replace(/Elfshoe/ig,'Elf Shoe').replace(/Heelboot/ig,'Heel Boot').replace(/Martialartshoes/ig,'Martial Art Shoes').replace(/Overknee/ig,'Over-knee').replace(/Maleflipflops/ig,'Flip-flops').replace(/Basicflatshoes/ig,'Basic Flat Shoes').replace(/Tophat/ig,'Top Hat').replace(/3 Dglasses/ig,'3D Glasses').replace(/Sunglass\b/ig,'Sunglasses').replace(/Mma\b/ig,'MMA');
  if(category==='Hair')name=name.replace(/\bMayhair\b/i,'May').replace(/\bHair\s*1$/i,'').replace(/\s+1$/,'').replace(/Hair\s+(\d+)$/i,'Style $1');
  if(category==='Facial hair')name=name.replace(/^Beard\s+(.+)/i,'$1 Beard').replace(/^(.+)\s+Beard\s+Beard$/i,'$1 Beard').replace(/^1 Long Scruffy 3 Beard$/i,'Long Scruffy Beard');
  if(category==='Eyebrows')name=name.replace(/^Eyebrows\s+/i,'Style ');
  if(category==='Eyelashes')name=name.replace(/^Eyelashes\s+/i,'Style ');
  if(category==='Nails')name=name.replace(/^Nails\s+/i,'').replace(/^01 Short$/,'Short Nails').replace(/^02 Medium$/,'Medium Nails').replace(/^03 Long$/,'Long Nails').replace(/^Toes 01$/,'Toe Nails');
  return name.replace(/\s+[AFM]$/,'').replace(/\s+/g,' ').trim()||`MakeHuman ${category||'asset'}`;
};
const encode = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString('base64');
const zipList = zip => execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split(/\r?\n/).filter(Boolean);
const zipRead = (zip, entry) => execFileSync('unzip', ['-p', zip, entry], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const archivePath = value => value.replaceAll('\\', '/').replace(/^\.\//, '');
const resolveArchiveEntry = (entries, ownerEntry, reference) => {
  if (!reference) return null;
  const direct = archivePath(join(dirname(ownerEntry), reference));
  return entries.find(entry => archivePath(entry) === direct)
    || entries.find(entry => dirname(archivePath(entry)) === dirname(archivePath(ownerEntry)) && basename(entry) === basename(reference))
    || entries.find(entry => basename(entry) === basename(reference));
};

function parseOBJ(source) {
  const sourcePositions = [], texcoords = [], positions = [], uvs = [], sourceVertices = [], triangles = [], vertexMap = new Map();
  // Match the normalization used by importRiggedGeometry for the canonical
  // hm08 base.obj (CC0): 6.88 scene units tall with feet at -3.41.
  const canonicalMinY = -8.4488, canonicalMidZ = (-1.1034 + 3.2564) / 2;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('v ')) {
      const [x, y, z] = line.split(/\s+/).slice(1, 4).map(Number);
      // System eye meshes use a feet-at-zero vertical origin, while ordinary
      // hm08 clothing uses the centred base-mesh origin.
      sourcePositions.push(x * canonicalScale, (y > 10 ? y : y - canonicalMinY) * canonicalScale - 3.41, (z - canonicalMidZ) * canonicalScale);
    } else if (line.startsWith('vt ')) {
      const [u,v]=line.split(/\s+/).slice(1,3).map(Number);texcoords.push(u,v);
    } else if (line.startsWith('f ')) {
      const sourceCount = sourcePositions.length / 3,uvCount=texcoords.length/2;
      const face = line.split(/\s+/).slice(1).map(item => {const [rawVertex,rawUV]=item.split('/').map(Number),vertex=rawVertex<0?sourceCount+rawVertex:rawVertex-1,uv=rawUV?(rawUV<0?uvCount+rawUV:rawUV-1):-1,key=`${vertex}/${uv}`;if(!vertexMap.has(key)){vertexMap.set(key,positions.length/3);positions.push(sourcePositions[vertex*3],sourcePositions[vertex*3+1],sourcePositions[vertex*3+2]);uvs.push(uv>=0?texcoords[uv*2]:0,uv>=0?texcoords[uv*2+1]:0);sourceVertices.push(vertex);}return vertexMap.get(key);});
      for (let i = 1; i + 1 < face.length; i++) triangles.push(face[0], face[i], face[i + 1]);
    }
  }
  if (!positions.length || !triangles.length) throw new Error('OBJ has no renderable geometry');
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], positions[i + axis]); max[axis] = Math.max(max[axis], positions[i + axis]); }
  const scale = max.map((value, axis) => Math.max(1e-8, (value - min[axis]) / 65535)), quantized = new Uint16Array(positions.length);
  for (let i = 0; i < positions.length; i++) quantized[i] = Math.max(0, Math.min(65535, Math.round((positions[i] - min[i % 3]) / scale[i % 3])));
  const indices = positions.length / 3 > 65535 ? new Uint32Array(triangles) : new Uint16Array(triangles);
  const quantizedUV=new Uint16Array(uvs.length);for(let i=0;i<uvs.length;i++)quantizedUV[i]=Math.max(0,Math.min(65535,Math.round(uvs[i]*65535)));
  return { vertexCount: positions.length / 3, sourceVertexCount:sourcePositions.length/3, sourceVertices, triangleCount: triangles.length / 3, min, scale, quantized, quantizedUV, indices };
}

function parseBindings(source, vertexCount) {
  const marker = source.match(/^verts\s+0\s*$/m); if (!marker) return null;
  const indices = new Uint16Array(vertexCount * 3), weights = new Float32Array(vertexCount * 3), offsets = new Float32Array(vertexCount * 3); let count = 0;
  for (const raw of source.slice(marker.index + marker[0].length).split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const values = line.split(/\s+/).map(Number); if (!values.length || !values.every(Number.isFinite)) break;
    if (values.length === 1) { indices[count * 3] = values[0]; weights[count * 3] = 1; count++; }
    else if (values.length >= 6) {
      const rawWeights = values.slice(3, 6), total = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
      for (let axis = 0; axis < 3; axis++) { indices[count * 3 + axis] = values[axis]; weights[count * 3 + axis] = rawWeights[axis] / total; offsets[count * 3 + axis] = values[6 + axis] || 0; }
      count++;
    } else break;
    if (count === vertexCount) break;
  }
  if (count !== vertexCount) return null;
  const scaleRefs = ['x','y','z'].map(axis => {
    const match = source.match(new RegExp(`^${axis}_scale\\s+(\\d+)\\s+(\\d+)\\s+([0-9.eE+-]+)`, 'm'));
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
  });
  return { indices, weights, offsets, scaleRefs };
}

function parseDeleteVerts(source) {
  const marker=source.match(/^delete_verts\s*$/m);if(!marker)return new Uint16Array();
  const values=[];for(const raw of source.slice(marker.index+marker[0].length).split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;if(!/^[\d\s-]+$/.test(line))break;const tokens=line.split(/\s+/);for(let i=0;i<tokens.length;i++){const start=Number(tokens[i]);if(!Number.isInteger(start))continue;if(tokens[i+1]==='-'&&Number.isInteger(Number(tokens[i+2]))){const end=Number(tokens[i+2]);for(let value=start;value<=end;value++)values.push(value);i+=2;}else values.push(start);}}
  return new Uint16Array([...new Set(values)].sort((a,b)=>a-b));
}

function quantizeRange(values,levels=65535,Type=Uint16Array,components=3) {
  const min = Array(components).fill(Infinity), max = Array(components).fill(-Infinity);
  for (let i = 0; i < values.length; i++) { const axis = i % components; min[axis] = Math.min(min[axis], values[i]); max[axis] = Math.max(max[axis], values[i]); }
  const scale = max.map((value, axis) => Math.max(1e-12, (value - min[axis]) / levels)), result = new Type(values.length);
  for (let i = 0; i < values.length; i++) result[i] = Math.max(0, Math.min(levels, Math.round((values[i] - min[i % components]) / scale[i % components])));
  return { values: result, min, scale };
}

const outputDir = 'assets/appearance-library',textureDir='assets/appearance-textures',temporary=mkdtempSync(join(tmpdir(),'ink-atlas-materials-'));
if(!append){rmSync(outputDir, { recursive: true, force: true });rmSync(textureDir,{recursive:true,force:true});}mkdirSync(outputDir, { recursive: true });mkdirSync(textureDir,{recursive:true});
let catalog=[];if(append&&existsSync('appearance-catalog.js')){const context={window:{}};vm.runInNewContext(readFileSync('appearance-catalog.js','utf8'),context);catalog=Array.isArray(context.window.INK_ATLAS_APPEARANCE_CATALOG)?context.window.INK_ATLAS_APPEARANCE_CATALOG:[];}
const existingIds=new Set(catalog.map(item=>item.id)),packs = readdirSync(downloads).filter(name => packPattern.test(name)).sort(), skipped = [];
for (const packFile of packs) {
  const zip = join(downloads, packFile), pack = packFile.replace(/\.zip$/i, ''), entries = zipList(zip);
  const jsonEntry = entries.find(entry => entry.toLowerCase().endsWith('.json')); let metadata = {};
  try { if (jsonEntry) metadata = JSON.parse(zipRead(zip, jsonEntry)); } catch (_) {}
  const metadataByName = new Map(Object.entries(metadata).map(([key, value]) => [normal(key), value]));
  for (const mhEntry of entries.filter(entry => entry.toLowerCase().endsWith('.mhclo')&&(!/^makehuman_system/i.test(pack)||/^eyes\//i.test(entry))).sort()) {
    try {
      const mhclo = zipRead(zip, mhEntry), objectName = mhclo.match(/^obj_file\s+(.+)$/m)?.[1]?.trim(), objEntry = resolveArchiveEntry(entries,mhEntry,objectName);
      if (!objEntry) throw new Error('missing referenced OBJ');
      const geometry = parseOBJ(zipRead(zip, objEntry)), sourceBindings = parseBindings(mhclo, geometry.sourceVertexCount), mhName = mhclo.match(/^name\s+(.+)$/m)?.[1]?.trim() || basename(mhEntry, '.mhclo'), key = normal(basename(mhEntry, '.mhclo'));
      const meta = metadataByName.get(key) || metadataByName.get(normal(mhName)) || {}, slug = `${pack}__${basename(mhEntry, '.mhclo')}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), headerAuthor = mhclo.match(/^#\s*author\s+(.+)$/mi)?.[1];
      const description = clean(meta.description), genderText = `${mhName} ${description}`.toLowerCase(), compatibility = /\bfemale\b/.test(genderText) && !/\bmale\b/.test(genderText) ? 'female' : /\bmale\b/.test(genderText) && !/\bfemale\b/.test(genderText) ? 'male' : 'all',category=categoryFor(pack,mhEntry,mhName);if(!category)continue;
      const author=clean(meta.author) || clean(headerAuthor) || 'MakeHuman community contributor',deleteVerts=parseDeleteVerts(mhclo),payload = { positionType:'q16', positionMin:geometry.min, positionScale:geometry.scale, positions:encode(geometry.quantized), uvs:encode(geometry.quantizedUV), indexType:geometry.indices instanceof Uint32Array?'u32':'u16', indices:encode(geometry.indices) };if(deleteVerts.length)payload.deleteVerts=encode(deleteVerts);
      let bindings=null;if(sourceBindings){const bindIndices=new Uint16Array(geometry.vertexCount*3),bindWeightsFloat=new Float32Array(geometry.vertexCount*2),bindOffsetsFloat=new Float32Array(geometry.vertexCount*3);geometry.sourceVertices.forEach((source,index)=>{bindIndices.set(sourceBindings.indices.subarray(source*3,source*3+3),index*3);bindWeightsFloat[index*2]=sourceBindings.weights[source*3];bindWeightsFloat[index*2+1]=sourceBindings.weights[source*3+1];bindOffsetsFloat.set(sourceBindings.offsets.subarray(source*3,source*3+3),index*3);});const bindWeights=quantizeRange(bindWeightsFloat,65535,Uint16Array,2),bindOffsets=quantizeRange(bindOffsetsFloat,255,Uint8Array,3);bindings={indices:bindIndices,weights:bindWeights.values,offsets:bindOffsets.values};Object.assign(payload, { bindIndices:encode(bindIndices), bindWeightType:'q16x2', bindWeightMin:bindWeights.min, bindWeightScale:bindWeights.scale, bindWeights:encode(bindWeights.values), bindOffsetType:'q8', bindOffsetMin:bindOffsets.min, bindOffsetScale:bindOffsets.scale, bindOffsets:encode(bindOffsets.values), bindScaleRefs:sourceBindings.scaleRefs, canonicalScale });}
      const materialName=mhclo.match(/^material\s+(.+)$/m)?.[1]?.trim(),materialEntry=resolveArchiveEntry(entries,mhEntry,materialName)||entries.find(entry=>dirname(entry)===dirname(mhEntry)&&entry.toLowerCase().endsWith('.mhmat'));let material={diffuseColor:[1,1,1],specularColor:[.04,.04,.04],shininess:.15,opacity:1},texture='';
      if(materialEntry){const materialSource=zipRead(zip,materialEntry),numbers=key=>materialSource.match(new RegExp(`^${key}\\s+([0-9.eE+ -]+)$`,'m'))?.[1].trim().split(/\s+/).map(Number);material.diffuseColor=numbers('diffuseColor')||material.diffuseColor;material.specularColor=numbers('specularColor')||material.specularColor;material.shininess=Number(materialSource.match(/^shininess\s+([0-9.eE+-]+)/m)?.[1]??material.shininess);material.opacity=Number(materialSource.match(/^opacity\s+([0-9.eE+-]+)/m)?.[1]??material.opacity);const textureName=materialSource.match(/^diffuseTexture\s+(.+)$/m)?.[1]?.trim(),textureEntry=resolveArchiveEntry(entries,materialEntry,textureName);if(textureEntry){try{const extension=extname(textureEntry)||'.png',input=join(temporary,`${slug}-source${extension}`);writeFileSync(input,execFileSync('unzip',['-p',zip,textureEntry],{encoding:null,maxBuffer:128*1024*1024}));const info=execFileSync('sips',['-g','hasAlpha',input],{encoding:'utf8'}),alpha=/hasAlpha:\s*yes/i.test(info),output=join(textureDir,`${slug}.${alpha?'png':'jpg'}`),args=['-Z','512'];if(!alpha)args.push('--setProperty','format','jpeg','--setProperty','formatOptions','78');args.push(input,'--out',output);execFileSync('sips',args,{stdio:'ignore'});texture=`assets/appearance-textures/${basename(output)}`;}catch(_){}}}
      // A number of community .mhmat files use opacity 0 while relying on the
      // diffuse image's alpha channel. Treat those as texture-driven opacity.
      if(texture&&material.opacity<=0)material.opacity=1;
      payload.material=material;if(texture)payload.texture=texture;
      writeFileSync(join(outputDir, `${slug}.js`), `window.INK_ATLAS_ASSET_PAYLOADS=window.INK_ATLAS_ASSET_PAYLOADS||{};window.INK_ATLAS_ASSET_PAYLOADS[${JSON.stringify(slug)}]=${JSON.stringify(payload)};\n`);
      const record={ id:slug, name:cleanName(mhName,author,category), category, pack, license:clean(meta.license) || (/cc0/i.test(pack)?'CC0':'CC-BY'), author, source:clean(meta.source), compatibility, bound:Boolean(bindings), textured:Boolean(texture), hiddenBodyVertices:deleteVerts.length, vertices:geometry.vertexCount, triangles:geometry.triangleCount, file:`assets/appearance-library/${slug}.js` };if(existingIds.has(slug)){catalog[catalog.findIndex(item=>item.id===slug)]=record;}else{catalog.push(record);existingIds.add(slug);}
    } catch (error) { skipped.push(`${packFile}: ${basename(mhEntry)} (${error.message})`); }
  }
}
catalog.sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
writeFileSync('appearance-catalog.js', `/* Generated from locally supplied MakeHuman asset packs. Geometry loads per item. */\nwindow.INK_ATLAS_APPEARANCE_CATALOG=${JSON.stringify(catalog)};\n`);
console.log(`Built ${catalog.length} lazy appearance assets from ${packs.length} packs; ${catalog.filter(item=>item.bound).length} use MakeHuman surface bindings.`);
if (skipped.length) console.warn(`Skipped ${skipped.length}:\n${skipped.join('\n')}`);
rmSync(temporary,{recursive:true,force:true});
