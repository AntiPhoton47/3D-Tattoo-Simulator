(() => {
  'use strict';

  const selectedBodyModel = window.INK_ATLAS_SELECTED_BODY_MODEL === 'female' ? 'female' : 'male';
  const V6 = {
    modelURL: selectedBodyModel === 'female' ? 'assets/female-base-mesh-base_female.glb' : 'assets/male-base-mesh-base_male.glb',
    modelFile: selectedBodyModel === 'female' ? 'female-base-mesh-base_female.glb' : 'male-base-mesh-base_male.glb',
    modelName: selectedBodyModel === 'female' ? 'MakeHuman CC0 feminine base mesh' : 'MakeHuman CC0 masculine base mesh',
    palette: {
      traditional: ['#171716', '#eee2cf', '#c74432', '#176378', '#c89459'],
      nocturne: ['#121318', '#ded8cf', '#5c3f83', '#187c83', '#b98545'],
      botanical: ['#171714', '#e8dfce', '#2f6951', '#a4413c', '#d1a05e'],
      mineral: ['#11161c', '#dfe1dc', '#315d77', '#9e4f3f', '#ae8b69'],
      blackwork: ['#121212', '#efe9dc', '#343434', '#77736d', '#b9b0a1']
    }
  };
  const bodyDefaults = selectedBodyModel === 'female'
    ? { heightCm: 165, chestCm: 91, waistCm: 74, hipsCm: 99, bicepsCm: 28, thighsCm: 58, shoulderCm: 39, breastSize: 50 }
    : { heightCm: 178, chestCm: 96, waistCm: 82, hipsCm: 96, bicepsCm: 32, thighsCm: 56, shoulderCm: 44, breastSize: 50 };
  const appearanceCatalog = Array.isArray(window.INK_ATLAS_APPEARANCE_CATALOG) ? window.INK_ATLAS_APPEARANCE_CATALOG : [];
  const appearanceById = new Map(appearanceCatalog.map(item => [item.id, item]));
  const defaultEyeId=appearanceById.has('makehuman_system_assets_cc0_high_poly')?'makehuman_system_assets_cc0_high_poly':'none';
  window.INK_ATLAS_ASSET_PAYLOADS = window.INK_ATLAS_ASSET_PAYLOADS || {};
  const bodySettings = { profile: 'balanced', frame: 'balanced', skinTone: '#dfc8b3', skinTonePosition: 72, modelType: selectedBodyModel, eyeStyle:defaultEyeId, eyebrowStyle:'none', eyelashStyle:'none', fingerNailStyle:'none', toeNailStyle:'none', noseShape:'none', earShape:'none', cheekShape:'none', eyeColor:'#514c48', clothingXRay: false, renderQuality: 'auto', equippedAssets: defaultEyeId==='none'?[]:[defaultEyeId], ...bodyDefaults };
  let needsSurfaceCoordinateMigration = true;
  try {
    const storedLayout = JSON.parse(localStorage.getItem('inkAtlas_tattoo_v1') || '{}'), prior = storedLayout.bodySettings;
    needsSurfaceCoordinateMigration = Number(storedLayout.version || 0) < 6.3;
    if (prior && ['balanced', 'athletic', 'broad', 'lean'].includes(prior.profile)) bodySettings.profile = prior.profile;
    if (prior && Number.isFinite(prior.heightCm)) bodySettings.heightCm = Math.max(130, Math.min(220, prior.heightCm));
    if (prior) for (const key of ['frame', 'skinTone', 'skinTonePosition', 'chestCm', 'waistCm', 'hipsCm', 'bicepsCm', 'thighsCm', 'shoulderCm', 'breastSize', 'eyeStyle', 'eyebrowStyle', 'eyelashStyle', 'fingerNailStyle', 'toeNailStyle', 'noseShape', 'earShape', 'cheekShape', 'eyeColor', 'clothingXRay', 'renderQuality']) if (prior[key] !== undefined) bodySettings[key] = prior[key];
    if (Array.isArray(prior?.equippedAssets)) bodySettings.equippedAssets = prior.equippedAssets.filter(id => appearanceById.has(id)).slice(0, 20);
  } catch (_) {}
  bodySettings.modelType = selectedBodyModel;
  const restoredBreastSize = Number(bodySettings.breastSize);
  bodySettings.breastSize = Number.isFinite(restoredBreastSize) ? Math.max(0, Math.min(200, restoredBreastSize)) : 50;
  const autoDpr = matchMedia('(max-width: 780px)').matches || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 1.15 : 1.75;
  window.INK_ATLAS_DPR_CAP = bodySettings.renderQuality === 'high' ? 2 : bodySettings.renderQuality === 'battery' ? 1 : autoDpr;
  window.INK_ATLAS_BODY_PROFILE = bodySettings.profile;
  window.INK_ATLAS_MEASUREMENTS = bodySettings;

  const leftRail = document.querySelector('.sidebar.left');
  const app = document.querySelector('.app');
  const canvasWrapV6 = document.getElementById('canvasWrap');

  function svgIcon(paths) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  function installGenerator() {
    const section = document.createElement('section');
    section.className = 'generator-panel';
    section.innerHTML = `<form id="tattooGeneratorForm">
      <div class="eyebrow">Tattoo generator</div>
      <h2>Create artwork</h2>
      <textarea id="generatorPrompt" class="generator-prompt" maxlength="180" placeholder="Describe a motif — e.g. koi with flowing waves, red chrysanthemum, geometric moth"></textarea>
      <label class="generator-control generator-engine">Generator
        <select id="generatorEngine">
          <option value="local">Local procedural</option>
          <option value="neural">Neural image endpoint</option>
        </select>
      </label>
      <div class="generator-controls">
        <label class="generator-control">Style
          <select id="generatorStyle">
            <option value="traditional">Traditional</option>
            <option value="neo">Neo-traditional</option>
            <option value="watercolour">Watercolour</option>
            <option value="linework">Fine line</option>
            <option value="blackwork">Blackwork</option>
          </select>
        </label>
        <label class="generator-control">Palette
          <select id="generatorPalette">
            <option value="traditional">Vermilion &amp; teal</option>
            <option value="botanical">Botanical</option>
            <option value="nocturne">Nocturne</option>
            <option value="mineral">Mineral</option>
            <option value="blackwork">Black ink</option>
          </select>
        </label>
      </div>
      <div class="neural-settings" id="neuralSettings" hidden>
        <label class="generator-control">HTTPS endpoint
          <input id="neuralEndpoint" type="url" inputmode="url" autocomplete="off" placeholder="https://your-service.example/generate">
        </label>
        <label class="generator-control">Bearer token · optional, never saved
          <input id="neuralToken" type="password" autocomplete="off" placeholder="Session only">
        </label>
        <p>POSTs the prompt, style, palette and <code>transparent: true</code>. Accepts <code>{ images: [...] }</code> with PNG data URLs, base64 PNGs or image URLs.</p>
      </div>
      <div class="generator-swatches" id="generatorSwatches" aria-label="Selected colour palette"></div>
      <button type="button" class="generator-button" id="generateTattooBtn">✦ Generate three designs</button>
      <div class="generator-status" id="generatorStatus">Local mode runs in this browser and sends nothing online.</div></form>`;
    leftRail.prepend(section);

    const paletteSelect = document.getElementById('generatorPalette');
    const swatches = document.getElementById('generatorSwatches');
    const renderSwatches = () => {
      swatches.innerHTML = V6.palette[paletteSelect.value].map(c => `<i style="--swatch:${c}" title="${c}"></i>`).join('');
    };
    paletteSelect.addEventListener('change', renderSwatches);
    renderSwatches();
    const engine = document.getElementById('generatorEngine');
    engine.addEventListener('change', () => {
      const neural = engine.value === 'neural';
      document.getElementById('neuralSettings').hidden = !neural;
      document.getElementById('generateTattooBtn').textContent = neural ? '✦ Generate transparent PNGs' : '✦ Generate three designs';
      document.getElementById('generatorStatus').textContent = neural ? 'Nothing is sent until you press Generate. The endpoint must allow browser requests.' : 'Local mode runs in this browser and sends nothing online.';
    });
    document.getElementById('generateTattooBtn').addEventListener('click', generateTattooSet);
  }

  function hashSeed(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function randomFrom(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function detectTheme(prompt) {
    const p = prompt.toLowerCase();
    if (/koi|fish|carp/.test(p)) return 'koi';
    if (/rose|flower|peony|chrysanthemum|botan|leaf/.test(p)) return 'flower';
    if (/snake|serpent|dragon/.test(p)) return 'serpent';
    if (/wave|ocean|sea|water|storm/.test(p)) return 'wave';
    if (/moon|sun|star|celest|eclipse/.test(p)) return 'celestial';
    if (/moth|butterfl|insect/.test(p)) return 'moth';
    if (/skull|bone|death/.test(p)) return 'skull';
    if (/bird|crane|raven|swallow/.test(p)) return 'bird';
    return 'geometric';
  }

  function motifMarkup(theme, colours, rnd, variant) {
    const [ink, paper, red, teal, ochre] = colours;
    const accent = variant % 2 ? teal : red;
    const second = variant % 3 ? ochre : teal;
    const wobble = Math.round((rnd() - .5) * 18);
    const line = `stroke="${ink}" stroke-width="${variant === 2 ? 11 : 15}" stroke-linecap="round" stroke-linejoin="round"`;
    const fine = `stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"`;
    const common = `<g fill="none" ${fine} opacity=".78"><path d="M105 660 Q320 ${610 + wobble} 535 660"/><path d="M145 695 Q320 ${650 - wobble} 495 695"/></g>`;
    const art = {
      koi: `<g transform="rotate(${wobble / 3} 320 390)"><path d="M176 530 C116 424 166 245 330 170 C417 130 511 192 487 290 C466 375 347 390 269 338 C229 312 190 335 178 393 C166 451 210 512 276 547 C234 578 196 566 176 530Z" fill="${accent}" ${line}/><path d="M280 340 C362 414 442 480 490 602 C416 574 353 535 303 466" fill="${second}" ${line}/><path d="M251 262 Q354 215 439 267 Q359 318 271 318Z" fill="${paper}" ${fine}/><circle cx="414" cy="256" r="13" fill="${ink}"/><g ${fine}>${[0,1,2,3].map(i => `<path d="M${248+i*44} ${360+i*18} q38 -24 66 12 q-35 34 -71 12"/>`).join('')}</g></g><path d="M93 562 Q171 508 248 563 T404 563 T560 563" fill="none" ${line}/>${common}`,
      flower: `<g transform="rotate(${wobble / 4} 320 360)">${[0,45,90,135].map((a,i) => `<ellipse cx="320" cy="270" rx="78" ry="158" transform="rotate(${a} 320 360)" fill="${i%2?accent:second}" ${line}/>`).join('')}<circle cx="320" cy="360" r="92" fill="${paper}" ${line}/><circle cx="320" cy="360" r="48" fill="${accent}" ${fine}/></g><path d="M321 459 C316 548 260 604 194 674 M321 514 C382 548 429 592 463 668" fill="none" ${line}/><path d="M258 561 Q175 525 151 588 Q218 614 273 581Z M380 562 Q472 525 499 594 Q428 617 368 583Z" fill="${teal}" ${line}/>${common}`,
      serpent: `<path d="M241 132 C446 174 460 314 298 354 C152 390 163 514 322 526 C469 538 494 647 392 708" fill="none" stroke="${accent}" stroke-width="94" stroke-linecap="round"/><path d="M241 132 C446 174 460 314 298 354 C152 390 163 514 322 526 C469 538 494 647 392 708" fill="none" ${line}/><path d="M184 118 L242 70 L309 128 L245 178Z" fill="${second}" ${line}/><circle cx="226" cy="121" r="10" fill="${paper}"/><path d="M396 704 l-45 45 m42-45 l29 55" ${fine}/>${[0,1,2,3,4].map(i => `<path d="M${286+(i%2)*42} ${220+i*84} l34 22 l-34 24" fill="none" ${fine}/>`).join('')}`,
      wave: `<path d="M83 528 C153 527 163 435 231 424 C299 413 317 505 379 486 C436 468 441 377 528 380 C460 313 388 295 330 328 C266 365 279 259 203 244 C231 330 168 354 128 395 C89 435 74 486 83 528Z" fill="${teal}" ${line}/><path d="M117 523 Q177 472 232 515 T349 515 T475 509" fill="none" ${fine}/><path d="M162 402 Q220 334 281 396 M322 338 Q390 272 461 347" fill="none" stroke="${paper}" stroke-width="16" stroke-linecap="round"/><circle cx="438" cy="215" r="74" fill="${accent}" ${line}/>${common}`,
      celestial: `<circle cx="320" cy="323" r="144" fill="${second}" ${line}/><circle cx="379" cy="277" r="145" fill="${paper}" ${line}/><g fill="${accent}" ${fine}>${[[147,187],[481,183],[134,453],[498,462],[321,102]].map(([x,y]) => `<path d="M${x} ${y-26} L${x+8} ${y-8} L${x+27} ${y} L${x+8} ${y+8} L${x} ${y+27} L${x-8} ${y+8} L${x-27} ${y} L${x-8} ${y-8}Z"/>`).join('')}</g><path d="M320 80 V38 M320 606 V720 M79 322 H34 M606 322 H560" ${line}/>${common}`,
      moth: `<g transform="rotate(${wobble/6} 320 372)"><path d="M302 322 C239 171 104 143 91 286 C83 383 185 435 298 421Z" fill="${accent}" ${line}/><path d="M338 322 C401 171 536 143 549 286 C557 383 455 435 342 421Z" fill="${second}" ${line}/><path d="M299 416 C209 404 151 467 174 568 C207 530 254 529 309 495Z" fill="${second}" ${line}/><path d="M341 416 C431 404 489 467 466 568 C433 530 386 529 331 495Z" fill="${accent}" ${line}/><ellipse cx="320" cy="399" rx="35" ry="164" fill="${ink}"/><path d="M308 235 Q260 152 219 123 M332 235 Q380 152 421 123" fill="none" ${fine}/><circle cx="203" cy="292" r="28" fill="${paper}" ${fine}/><circle cx="437" cy="292" r="28" fill="${paper}" ${fine}/></g>${common}`,
      skull: `<path d="M178 274 C180 136 459 126 466 273 C469 351 425 398 389 427 L382 554 L345 524 L318 558 L288 524 L247 554 L245 429 C199 396 176 352 178 274Z" fill="${paper}" ${line}/><path d="M221 306 Q270 254 304 321 Q275 381 218 352Z M419 306 Q370 254 336 321 Q365 381 422 352Z" fill="${ink}"/><path d="M320 345 l-30 78 h60Z" fill="${accent}" ${fine}/><path d="M260 449 H379 M282 449 V524 M320 449 V548 M359 449 V524" ${fine}/><path d="M144 552 Q321 620 500 552" fill="none" ${line}/>${common}`,
      bird: `<path d="M96 368 C196 371 217 277 312 321 C382 223 477 245 554 306 C474 303 437 360 394 403 C345 451 267 466 207 431 C166 407 130 385 96 368Z" fill="${paper}" ${line}/><path d="M207 430 Q276 354 391 403 M273 401 Q295 325 312 321 M349 377 Q421 318 502 311" fill="none" ${fine}/><path d="M386 402 Q457 471 518 548 Q416 529 342 456Z" fill="${accent}" ${line}/><circle cx="452" cy="300" r="10" fill="${ink}"/><path d="M538 299 l69 24 l-67 22" fill="${second}" ${fine}/>${common}`,
      geometric: `<g transform="rotate(${wobble/5} 320 370)">${[0,30,60,90,120,150].map((a,i) => `<ellipse cx="320" cy="315" rx="74" ry="210" transform="rotate(${a} 320 370)" fill="${i%3===0?accent:'none'}" ${fine}/>`).join('')}<circle cx="320" cy="370" r="108" fill="${paper}" ${line}/><path d="M320 216 L452 447 L188 447Z" fill="${second}" fill-opacity=".72" ${line}/><circle cx="320" cy="370" r="40" fill="${accent}" ${fine}/></g>${common}`
    };
    return art[theme] || art.geometric;
  }

  function buildTattooSVG(prompt, style, paletteKey, variant) {
    const colours = [...V6.palette[paletteKey]];
    if (style === 'blackwork' || style === 'linework') {
      colours.splice(2, 3, '#272727', '#55514d', '#92897d');
    }
    const rnd = randomFrom(hashSeed(`${prompt}|${style}|${paletteKey}|${variant}`));
    const theme = detectTheme(prompt);
    const paperOpacity = style === 'watercolour' ? '.45' : '1';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 780" width="640" height="780">
      <g opacity="${paperOpacity}">${motifMarkup(theme, colours, rnd, variant)}</g>
      <g fill="${colours[0]}" opacity=".7">${Array.from({length: 9}, (_, i) => {
        const x = 105 + rnd() * 430, y = 95 + rnd() * 590, r = 2 + rnd() * 5;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>`;
      }).join('')}</g>
    </svg>`;
  }

  function titleFromPrompt(prompt) {
    return prompt.trim().split(/\s+/).slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  async function imageSourceToDataURL(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('The endpoint returned an empty image.');
    if (/^data:image\/(png|webp);base64,/i.test(value)) return value;
    if (/^[A-Za-z0-9+/=\s]+$/.test(value) && value.replace(/\s/g, '').length > 256) return `data:image/png;base64,${value.replace(/\s/g, '')}`;
    const url = new URL(value, location.href);
    if (url.protocol !== 'https:' && url.origin !== location.origin) throw new Error('Image URLs must use HTTPS.');
    const response = await fetch(url.href, { mode: 'cors' });
    if (!response.ok) throw new Error(`Could not fetch generated image (${response.status}).`);
    const blob = await response.blob();
    if (!/^image\/(png|webp)$/i.test(blob.type)) throw new Error('The endpoint must return PNG or WebP artwork.');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read generated image.')); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
  }

  async function requestNeuralTattooSet(prompt, style, paletteKey) {
    const endpointValue = document.getElementById('neuralEndpoint').value.trim();
    if (!endpointValue) throw new Error('Add your neural image endpoint first.');
    const endpoint = new URL(endpointValue);
    if (endpoint.protocol !== 'https:' && endpoint.origin !== location.origin) throw new Error('Use an HTTPS endpoint.');
    const token = document.getElementById('neuralToken').value.trim();
    const response = await fetch(endpoint.href, {
      method: 'POST', mode: 'cors',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ prompt, style, palette: V6.palette[paletteKey], transparent: true, format: 'png', count: 3 })
    });
    if (!response.ok) throw new Error(`Neural endpoint returned ${response.status}.`);
    const payload = await response.json();
    const values = Array.isArray(payload.images) ? payload.images : payload.data;
    if (!Array.isArray(values) || !values.length) throw new Error('Expected an images array from the endpoint.');
    return await Promise.all(values.slice(0, 3).map(item => imageSourceToDataURL(typeof item === 'string' ? item : item.url || item.data || item.b64_json)));
  }

  async function generateTattooSet() {
    const promptEl = document.getElementById('generatorPrompt');
    const prompt = promptEl.value.trim();
    const status = document.getElementById('generatorStatus');
    if (prompt.length < 3) {
      promptEl.focus();
      status.textContent = 'Add a short description first — a subject, mood, or composition is enough.';
      return;
    }
    const style = document.getElementById('generatorStyle').value;
    const paletteKey = document.getElementById('generatorPalette').value;
    const title = titleFromPrompt(prompt);
    const engine = document.getElementById('generatorEngine').value;
    const button = document.getElementById('generateTattooBtn');
    const created = [];
    button.disabled = true;
    status.textContent = engine === 'neural' ? 'Requesting transparent PNG artwork…' : 'Creating three local variations…';
    try {
      const sources = engine === 'neural'
        ? await requestNeuralTattooSet(prompt, style, paletteKey)
        : [0, 1, 2].map(variant => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildTattooSVG(prompt, style, paletteKey, variant))}`);
      for (let variant = 0; variant < sources.length; variant++) {
        const asset = {
          id: `generated_${Date.now()}_${variant}_${hashSeed(prompt).toString(36)}`,
          name: `${title} ${variant + 1}`,
          cat: 'Generated', src: sources[variant], size: .24, ratio: 640 / 780,
          reference: false, colour: engine === 'neural' || (paletteKey !== 'blackwork' && style !== 'blackwork' && style !== 'linework'), prompt, style, palette: paletteKey, engine
        };
        ASSETS.push(asset); loadAssetImg(asset); created.push(asset);
      }
      activeFilter = 'Generated'; pendingAsset = created[0].id; selectedId = null;
      renderLibrary(); renderInspector(); saveLayout(false);
      status.innerHTML = `<span class="colour-flag">${created.length} ${engine === 'neural' ? 'neural PNG' : style.replace('-', ' ')} design${created.length === 1 ? '' : 's'} added</span> · Select one, then tap the body.`;
      toast(`${created.length} tattoo variation${created.length === 1 ? '' : 's'} generated`);
    } catch (error) {
      status.textContent = error.message;
      toast('Generation failed: ' + error.message);
    } finally {
      button.disabled = false;
    }
  }

  const originalRenderLibrary = renderLibrary;
  renderLibrary = function renderLibraryV6() {
    const cats = ['All', 'Generated', 'Botanical', 'Animals', 'Nature', 'Traditional', 'Geometric', 'Minimal', 'Utilities', 'Uploads'];
    const filtersEl = $('filters');
    filtersEl.innerHTML = cats.filter(cat => cat === 'All' || ASSETS.some(a => a.cat === cat)).map(cat => `<button data-cat="${cat}" class="${cat === activeFilter ? 'on' : ''}">${escapeHTML(cat)}</button>`).join('');
    for (const button of filtersEl.children) button.onclick = () => { activeFilter = button.dataset.cat; renderLibrary(); };
    const query = $('searchInput').value.toLowerCase().trim();
    const items = ASSETS.filter(a => (activeFilter === 'All' || a.cat === activeFilter) && (!query || `${a.name} ${a.prompt || ''}`.toLowerCase().includes(query)));
    $('library').innerHTML = items.length ? items.map(a => `<button class="asset ${pendingAsset === a.id ? 'on' : ''}" data-asset="${escapeHTML(a.id)}" data-colour="${a.colour === true}"><div class="preview"><img src="${a.src}" loading="lazy" alt="${escapeHTML(a.name)}"></div><div class="assetname">${escapeHTML(a.name)}</div><div class="assetkind">${escapeHTML(a.cat)} ${a.colour ? '· full colour' : a.reference ? '· reference' : ''}</div></button>`).join('') : '<div class="empty">No matching motifs found.</div>';
    for (const button of $('library').querySelectorAll('[data-asset]')) button.onclick = () => selectAsset(button.dataset.asset);
  };

  const originalSelectAsset = selectAsset;
  selectAsset = function selectAssetV6(id) {
    originalSelectAsset(id);
    if (matchMedia('(max-width: 780px)').matches) setMobilePanel('body');
  };

  const originalSelectTattoo = selectTattoo;
  selectTattoo = function selectTattooV6(id) {
    originalSelectTattoo(id);
    if (matchMedia('(max-width: 780px)').matches) setMobilePanel('edit');
  };

  const tintCache = new WeakMap();
  function tintedImage(image, colour) {
    let colours = tintCache.get(image);
    if (!colours) { colours = new Map(); tintCache.set(image, colours); }
    if (colours.has(colour)) return colours.get(colour);
    const c = document.createElement('canvas');
    c.width = Math.max(1, image.naturalWidth);
    c.height = Math.max(1, image.naturalHeight);
    const cctx = c.getContext('2d');
    cctx.drawImage(image, 0, 0);
    cctx.globalCompositeOperation = 'source-in';
    cctx.fillStyle = colour;
    cctx.fillRect(0, 0, c.width, c.height);
    colours.set(colour, c);
    return c;
  }

  const seamLinks = [
    ['torso', 'low', 'pelvis', 'high'], ['pelvis', 'high', 'torso', 'low'],
    ['pelvis', 'low', 'left_thigh', 'high'], ['pelvis', 'low', 'right_thigh', 'high'],
    ['left_thigh', 'high', 'pelvis', 'low'], ['right_thigh', 'high', 'pelvis', 'low'],
    ['left_thigh', 'low', 'left_calf', 'high'], ['right_thigh', 'low', 'right_calf', 'high'],
    ['left_calf', 'high', 'left_thigh', 'low'], ['right_calf', 'high', 'right_thigh', 'low'],
    ['left_upper_arm', 'low', 'left_forearm', 'high'], ['right_upper_arm', 'low', 'right_forearm', 'high'],
    ['left_forearm', 'high', 'left_upper_arm', 'low'], ['right_forearm', 'high', 'right_upper_arm', 'low'],
    ['left_forearm', 'low', 'left_hand', 'high'], ['right_forearm', 'low', 'right_hand', 'high'],
    ['left_hand', 'high', 'left_forearm', 'low'], ['right_hand', 'high', 'right_forearm', 'low'],
    ['left_calf', 'low', 'left_foot', 'high'], ['right_calf', 'low', 'right_foot', 'high'],
    ['left_foot', 'high', 'left_calf', 'low'], ['right_foot', 'high', 'right_calf', 'low'],
    ['torso', 'high', 'neck', 'low'], ['neck', 'low', 'torso', 'high'],
    ['neck', 'high', 'head', 'low'], ['head', 'low', 'neck', 'high']
  ];

  function decalsForPart(target) {
    const copies = tattoos.filter(tattoo => tattoo.part === target.id).map(tattoo => ({ tattoo, u: tattoo.u, v: tattoo.v, size: tattoo.size }));
    for (const tattoo of tattoos) {
      const source = partById[tattoo.part], asset = assetMap()[tattoo.asset];
      if (!source || !asset) continue;
      const normalizedHeight = clamp(tattoo.size * source.circumference / (source.length * (asset.ratio || 1)), .006, 1.25);
      for (const [sourceId, sourceEdge, targetId, targetEdge] of seamLinks) {
        if (sourceId !== tattoo.part || targetId !== target.id) continue;
        const edgeDistance = sourceEdge === 'low' ? tattoo.v : 1 - tattoo.v;
        if (edgeDistance > normalizedHeight / 2) continue;
        const targetV = targetEdge === 'high' ? 1 + edgeDistance * source.length / target.length : -edgeDistance * source.length / target.length;
        copies.push({ tattoo, u: tattoo.u, v: targetV, size: tattoo.size * source.circumference / target.circumference });
      }
    }
    return copies;
  }

  const markDirtyBase = markDirty;
  markDirty = function markDirtyWithSeams(id) {
    markDirtyBase(id);
    for (const [sourceId, , targetId] of seamLinks) if (sourceId === id || targetId === id) {
      const linked = partById[sourceId === id ? targetId : sourceId];
      if (linked) linked.dirty = true;
    }
  };

  function clothingCoverage(partId, v = .5) {
    let covered = false;
    const equippedCategories = new Set((bodySettings.equippedAssets || []).map(id => appearanceById.get(id)?.category).filter(Boolean));
    if (equippedCategories.has('Dresses') && (partId === 'torso' || partId === 'pelvis' || partId.endsWith('_thigh'))) covered = true;
    if ((equippedCategories.has('Tops') || equippedCategories.has('Underlayers')) && (partId === 'torso' || partId === 'pelvis' || partId.endsWith('_upper_arm'))) covered = true;
    if ((equippedCategories.has('Bottoms') || equippedCategories.has('Skirts') || equippedCategories.has('Underlayers')) && (partId === 'pelvis' || partId.endsWith('_thigh') || partId.endsWith('_calf'))) covered = true;
    if (equippedCategories.has('Shoes') && (partId.endsWith('_foot') || (partId.endsWith('_calf') && v < .38))) covered = true;
    if (equippedCategories.has('Gloves') && (partId.endsWith('_hand') || (partId.endsWith('_forearm') && v < .58))) covered = true;
    if (partId === 'head' && ['Hair','Hats','Eyewear'].some(category => equippedCategories.has(category))) covered = true;
    return covered;
  }

  // Clothing and grooming are rendered exclusively from the MakeHuman asset
  // catalog. The earlier texture-painted procedural layer has been retired.

  // A shallow second skin gives garments, hair and accessories a visible edge
  // instead of baking every choice flat into the mannequin texture. It reuses
  // the posed body buffers, so layers follow the same skeleton without clipping.
  let appearanceProgram = null;
  function ensureAppearanceProgram() {
    if (appearanceProgram || software) return;
    const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uViewProjection;uniform float uOffset;varying vec3 vNormal;varying vec2 vUV;void main(){vNormal=aNormal;vUV=aUV;gl_Position=uViewProjection*vec4(aPosition+aNormal*uOffset,1.);}`;
    const fragment = `precision mediump float;uniform vec4 uColour;uniform vec3 uAccent;uniform vec4 uBounds;varying vec3 vNormal;varying vec2 vUV;void main(){if(vUV.x<uBounds.x||vUV.x>uBounds.y||vUV.y<uBounds.z||vUV.y>uBounds.w)discard;vec3 n=normalize(vNormal);float light=.54+.38*max(0.,dot(n,normalize(vec3(-.55,.82,1.1))))+.10*max(0.,dot(n,normalize(vec3(.72,.22,.40))));float weave=.025*sin(vUV.x*620.)*sin(vUV.y*710.);float edge=min(min(vUV.x-uBounds.x,uBounds.y-vUV.x),min(vUV.y-uBounds.z,uBounds.w-vUV.y));vec3 colour=mix(uAccent,uColour.rgb,smoothstep(0.,.014,edge));gl_FragColor=vec4(colour*(light+weave)+.018,uColour.a);}`;
    const instance = gl.createProgram(); gl.attachShader(instance, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(instance, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(instance);
    appearanceProgram = { instance, pos:gl.getAttribLocation(instance,'aPosition'), norm:gl.getAttribLocation(instance,'aNormal'), uv:gl.getAttribLocation(instance,'aUV'), vp:gl.getUniformLocation(instance,'uViewProjection'), offset:gl.getUniformLocation(instance,'uOffset'), colour:gl.getUniformLocation(instance,'uColour'), accent:gl.getUniformLocation(instance,'uAccent'), bounds:gl.getUniformLocation(instance,'uBounds') };
  }
  const colour4 = (hex, alpha=1) => { const value=String(hex||'#333333').replace('#',''),full=value.length===3?value.split('').map(c=>c+c).join(''):value;return [parseInt(full.slice(0,2),16)/255,parseInt(full.slice(2,4),16)/255,parseInt(full.slice(4,6),16)/255,alpha]; };
  function appearancePasses() {
    return [];
  }
  function renderAppearanceLayers(){
    if(software)return;const passes=appearancePasses();if(!passes.length)return;ensureAppearanceProgram();const pgr=appearanceProgram;gl.useProgram(pgr.instance);gl.uniformMatrix4fv(pgr.vp,false,viewProjection);gl.enable(gl.DEPTH_TEST);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-.8,-.8);
    for(const pass of passes){const part=partById[pass.part];if(!part)continue;const colour=colour4(pass.colour,pass.alpha),edge=colour4(pass.accent);gl.uniform1f(pgr.offset,pass.offset);gl.uniform4fv(pgr.colour,colour);gl.uniform3fv(pgr.accent,edge.slice(0,3));gl.uniform4fv(pgr.bounds,pass.bounds);if(pass.alpha<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}gl.bindBuffer(gl.ARRAY_BUFFER,part.pb);gl.vertexAttribPointer(pgr.pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.pos);gl.bindBuffer(gl.ARRAY_BUFFER,part.nb);gl.vertexAttribPointer(pgr.norm,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.norm);gl.bindBuffer(gl.ARRAY_BUFFER,part.ub);gl.vertexAttribPointer(pgr.uv,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.uv);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.ib);gl.drawElements(gl.TRIANGLES,part.count,part.indexType||gl.UNSIGNED_SHORT,0);if(pass.alpha<1){gl.depthMask(true);gl.disable(gl.BLEND);}}
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  // MakeHuman wardrobe and grooming meshes remain local, retain their source
  // materials, and are loaded only when selected.
  let meshAppearanceProgram = null;
  const meshAppearanceCache = new Map();
  const appearanceLoadPromises = new Map();
  const baseVertexMapCache = new Map();
  function typedArrayFromBase64(encoded, Type) {
    const binary = atob(encoded), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Type(bytes.buffer);
  }
  function baseVertexMap(){const key=bodySettings.modelType;if(!baseVertexMapCache.has(key)){const encoded=window.INK_ATLAS_BASE_VERTEX_MAPS?.[key];baseVertexMapCache.set(key,encoded?typedArrayFromBase64(encoded,Uint32Array):null);}return baseVertexMapCache.get(key);}
  window.INK_ATLAS_ACTIVE_BASE_VERTEX_MAP=baseVertexMap();
  window.INK_ATLAS_ANATOMY_DECODED=new Map((window.INK_ATLAS_ANATOMY_LIBRARY||[]).map(item=>[item.id,{...item,indices:typedArrayFromBase64(item.indices,Uint16Array),deltas:typedArrayFromBase64(item.deltas,Int16Array)}]));
  function loadAppearanceAsset(id) {
    if (window.INK_ATLAS_APPEARANCE_ASSETS?.[id] || window.INK_ATLAS_ASSET_PAYLOADS?.[id]) return Promise.resolve(id);
    if (appearanceLoadPromises.has(id)) return appearanceLoadPromises.get(id);
    const item = appearanceById.get(id); if (!item) return Promise.reject(new Error('Unknown appearance asset'));
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = `${item.file}?v=1.3.0`; script.async = true;
      script.onload = () => { requestDraw(); resolve(id); };
      script.onerror = () => { appearanceLoadPromises.delete(id); reject(new Error(`Could not load ${item.name}`)); };
      document.head.append(script);
    });
    appearanceLoadPromises.set(id, promise); return promise;
  }
  function ensureMeshAppearanceProgram() {
    if (meshAppearanceProgram || software) return;
    const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uViewProjection;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){vNormal=aNormal;vPosition=aPosition;vUV=aUV;gl_Position=uViewProjection*vec4(aPosition,1.);}`;
    const fragment = `precision mediump float;uniform vec4 uColour;uniform vec3 uAccent;uniform float uFabric;uniform float uUseTexture;uniform float uShininess;uniform float uEye;uniform sampler2D uTexture;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){vec3 n=normalize(vNormal);float key=max(0.,dot(n,normalize(vec3(-.55,.82,1.1))));float fill=max(0.,dot(n,normalize(vec3(.72,.22,.40))));float light=.50+.39*key+.11*fill;float grain=uFabric*.018*sin(vPosition.x*155.)*sin(vPosition.y*190.);vec4 sample=texture2D(uTexture,vUV);float luma=dot(sample.rgb,vec3(.299,.587,.114)),iris=(1.-smoothstep(.28,.70,luma))*uEye;vec3 textured=mix(sample.rgb,sample.rgb*(uAccent*1.8+.18),iris*.72),plain=mix(uAccent,uColour.rgb,.90+.06*key),colour=mix(plain,textured*uColour.rgb,uUseTexture);float spec=pow(max(0.,dot(reflect(-normalize(vec3(-.55,.82,1.1)),n),normalize(vec3(0.,0.,1.)))),mix(8.,72.,uShininess))*.18*uShininess;float alpha=uColour.a*mix(1.,sample.a,uUseTexture);if(alpha<.035)discard;gl_FragColor=vec4(colour*(light+grain)+spec+.018,alpha);}`;
    const instance = gl.createProgram(); gl.attachShader(instance, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(instance, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(instance);
    meshAppearanceProgram = { instance, pos:gl.getAttribLocation(instance,'aPosition'), norm:gl.getAttribLocation(instance,'aNormal'), uv:gl.getAttribLocation(instance,'aUV'), vp:gl.getUniformLocation(instance,'uViewProjection'), colour:gl.getUniformLocation(instance,'uColour'), accent:gl.getUniformLocation(instance,'uAccent'), fabric:gl.getUniformLocation(instance,'uFabric'), useTexture:gl.getUniformLocation(instance,'uUseTexture'), shininess:gl.getUniformLocation(instance,'uShininess'), eye:gl.getUniformLocation(instance,'uEye'), texture:gl.getUniformLocation(instance,'uTexture') };
  }
  function ensureMeshAppearanceAsset(id) {
    if (meshAppearanceCache.has(id)) return meshAppearanceCache.get(id);
    const raw = window.INK_ATLAS_APPEARANCE_ASSETS?.[id] || window.INK_ATLAS_ASSET_PAYLOADS?.[id]; if (!raw || software) return null;
    let restPositions;
    if (raw.positionType === 'q16') {
      const quantized = typedArrayFromBase64(raw.positions, Uint16Array); restPositions = new Float32Array(quantized.length);
      for (let i = 0; i < quantized.length; i++) restPositions[i] = raw.positionMin[i % 3] + quantized[i] * raw.positionScale[i % 3];
    } else restPositions = typedArrayFromBase64(raw.positions, Float32Array);
    const catalog=appearanceById.get(id);if(catalog?.category==='Eyes'){for(let i=0;i<restPositions.length;i+=3){const centreX=restPositions[i]<0?-.112:.112,centreY=2.985,centreZ=.108;restPositions[i]=centreX+(restPositions[i]-centreX)*.72;restPositions[i+1]=centreY+(restPositions[i+1]-centreY)*.48;restPositions[i+2]=centreZ+(restPositions[i+2]-centreZ)*.70-.040;}}
    if(catalog?.category==='Facial hair'){let maxY=-Infinity;for(let i=1;i<restPositions.length;i+=3)maxY=Math.max(maxY,restPositions[i]);const targetMax=/moustache/i.test(catalog.name)?3.08:3.14,shift=Math.min(0,targetMax-maxY);for(let i=1;i<restPositions.length;i+=3)restPositions[i]+=shift;}
    if(catalog?.category==='Hair'){const centreY=3.0,centreZ=-.05;for(let i=0;i<restPositions.length;i+=3){restPositions[i]*=1.08;restPositions[i+1]=centreY+(restPositions[i+1]-centreY)*1.10+.018;restPositions[i+2]=centreZ+(restPositions[i+2]-centreZ)*1.08;}}
    const indices = typedArrayFromBase64(raw.indices, raw.indexType === 'u32' ? Uint32Array : Uint16Array);
    let uvs=new Float32Array(restPositions.length/3*2);if(raw.uvs){const encodedUV=typedArrayFromBase64(raw.uvs,Uint16Array);for(let i=0;i<encodedUV.length;i++)uvs[i]=encodedUV[i]/65535;}
    const mesh = { id, catalog, material:raw.material||{}, textureURL:raw.texture||'', textureReady:false, restPositions, positions:restPositions.slice(), normals:new Float32Array(restPositions.length), uvs, indices, bindIndices:raw.bindIndices?typedArrayFromBase64(raw.bindIndices,Uint16Array):null, bindWeights:raw.bindWeights?typedArrayFromBase64(raw.bindWeights,Uint8Array):null, bindRig:null, bindLocalOffsets:null, bindFrameScales:null, count:indices.length, indexType:indices instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT, pb:gl.createBuffer(), nb:gl.createBuffer(), ub:gl.createBuffer(), ib:gl.createBuffer(), texture:gl.createTexture() };
    recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.ub);gl.bufferData(gl.ARRAY_BUFFER,mesh.uvs,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
    if(mesh.textureURL){const image=new Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);mesh.textureReady=true;requestDraw();};image.src=mesh.textureURL;}
    meshAppearanceCache.set(id,mesh);return mesh;
  }
  function attachmentFrame(points) {
    const first=sub(points[1],points[0]),second=sub(points[2],points[0]),length1=Math.hypot(...first),normalRaw=cross(first,second),normalLength=Math.hypot(...normalRaw);
    if(length1<1e-7||normalLength<1e-9)return {x:[1,0,0],y:[0,1,0],n:[0,0,1],sx:1,sy:1};
    const x=scale(first,1/length1),n=scale(normalRaw,1/normalLength),y=normal(cross(n,x)),length2=Math.max(1e-7,Math.abs(dot(second,y)));
    return {x,y,n,sx:length1,sy:length2};
  }
  function prepareSurfaceBindings(mesh) {
    if (!importedRig || !mesh.bindIndices || !mesh.bindWeights || !importedRig.neutralPoint) return false;
    if (mesh.bindRig === importedRig && mesh.bindLocalOffsets) return true;
    const baseMap=baseVertexMap();if(!baseMap)return false;
    const count=mesh.restPositions.length/3,offsets=new Float32Array(count*3),scales=new Float32Array(count*2);
    for(let vertex=0;vertex<count;vertex++){
      const at=vertex*3,canonical=[mesh.bindIndices[at],mesh.bindIndices[at+1],mesh.bindIndices[at+2]];if(canonical.some(index=>index>=baseMap.length))return false;const ids=canonical.map(index=>baseMap[index]),weights=[mesh.bindWeights[at]/255,mesh.bindWeights[at+1]/255,mesh.bindWeights[at+2]/255];
      const points=ids.map(index=>importedRig.neutralPoint(index)),anchor=[0,0,0];for(let p=0;p<3;p++)for(let axis=0;axis<3;axis++)anchor[axis]+=points[p][axis]*weights[p];const frame=attachmentFrame(points),offset=[mesh.restPositions[at]-anchor[0],mesh.restPositions[at+1]-anchor[1],mesh.restPositions[at+2]-anchor[2]];offsets[at]=dot(offset,frame.x);offsets[at+1]=dot(offset,frame.y);offsets[at+2]=dot(offset,frame.n);scales[vertex*2]=frame.sx;scales[vertex*2+1]=frame.sy;
    }
    mesh.bindRig=importedRig;mesh.bindLocalOffsets=offsets;mesh.bindFrameScales=scales;return true;
  }
  function blendPoint(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
  function transformAppearancePoint(id, point) {
    let p=point.slice(), x=p[0], y=p[1], z=p[2], side=x<0?-1:1, ax=Math.abs(x), isShirt=id.startsWith('shirt_');
    const female=bodySettings.modelType==='female',base=female?{chest:91,waist:74,shoulders:39}:{chest:96,waist:82,shoulders:44},safe=(value,baseline,strength=.64)=>clamp(1+(((Number(value)||baseline)/baseline)-1)*strength,.84,1.19);
    if(isShirt){
      const chest=safe(bodySettings.chestCm,base.chest),waist=safe(bodySettings.waistCm,base.waist),shoulders=safe(bodySettings.shoulderCm,base.shoulders,.62),chestW=step01(.72,1.12,y)*(1-step01(2.10,2.42,y)),waistW=step01(.10,.42,y)*(1-step01(.92,1.30,y)),shoulderW=step01(1.36,1.72,y)*(1-step01(2.35,2.66,y));
      p[0]*=1+(chest-1)*chestW+(waist-1)*waistW;p[2]*=1+(chest-1)*chestW*.84+(waist-1)*waistW*.82;p[0]+=side*(shoulders-1)*.56*shoulderW;
      if(female){
        const rawValue=Number(bodySettings.breastSize),value=Math.max(0,Math.min(200,Number.isFinite(rawValue)?rawValue:50)),amount=value<50?clamp((value-50)/50,-1,0):clamp((value-50)/150,0,1),dx=x-side*.285,dy=y-1.72,dz=z-.13,front=step01(.015,.22,z),breast=Math.exp(-Math.pow(dx/.38,2)-Math.pow(dy/.47,2)-Math.pow(Math.max(0,dz-.34)/.38,2))*front,radial=amount*breast;
        p[0]+=dx*.95*radial;p[1]+=dy*.95*radial;p[2]+=dz*.95*radial+amount*.20*breast;
      }
      const sleeve=step01(.54,.94,ax)*step01(.55,1.10,y),shoulder=[side*.86,2.29,0],sideName=side<0?'left':'right';
      let posed=spinX(p,shoulder,-(pose[sideName+'ShoulderForward']||0)*RAD*.72);posed=spinZ(posed,shoulder,side*(pose[sideName+'Shoulder']||0)*RAD*.48);
      const twist=(pose[sideName+'ArmTwist']||0)*RAD*.34,ct=Math.cos(twist),st=Math.sin(twist),dy=p[1]-shoulder[1],dz=p[2]-shoulder[2],twisted=[p[0],shoulder[1]+ct*dy-st*dz,shoulder[2]+st*dy+ct*dz];
      posed=blendPoint(posed,twisted,Math.min(.38,sleeve*.38));p=blendPoint(p,posed,sleeve);
    }
    const heightScale=clamp((Number(bodySettings.heightCm)||178)/178,.78,1.22);p[1]=(p[1]+3.41)*heightScale-3.41;return p;
  }
  function updateMeshAppearanceAsset(mesh) {
    if(prepareSurfaceBindings(mesh)){
      const baseMap=baseVertexMap();
      for(let vertex=0;vertex<mesh.restPositions.length/3;vertex++){
        const at=vertex*3,ids=[baseMap[mesh.bindIndices[at]],baseMap[mesh.bindIndices[at+1]],baseMap[mesh.bindIndices[at+2]]],weights=[mesh.bindWeights[at]/255,mesh.bindWeights[at+1]/255,mesh.bindWeights[at+2]/255],points=ids.map(index=>importedRig.worldPoint(index)),anchor=[0,0,0];
        for(let p=0;p<3;p++)for(let axis=0;axis<3;axis++)anchor[axis]+=points[p][axis]*weights[p];const frame=attachmentFrame(points),sx=clamp(frame.sx/(mesh.bindFrameScales[vertex*2]||frame.sx),.72,1.42),sy=clamp(frame.sy/(mesh.bindFrameScales[vertex*2+1]||frame.sy),.72,1.42),normalScale=Math.sqrt(sx*sy),local=[mesh.bindLocalOffsets[at]*sx,mesh.bindLocalOffsets[at+1]*sy,mesh.bindLocalOffsets[at+2]*normalScale];for(let axis=0;axis<3;axis++)mesh.positions[at+axis]=anchor[axis]+frame.x[axis]*local[0]+frame.y[axis]*local[1]+frame.n[axis]*local[2];
      }
    }else for(let i=0;i<mesh.restPositions.length;i+=3){const transformed=transformAppearancePoint(mesh.id,[mesh.restPositions[i],mesh.restPositions[i+1],mesh.restPositions[i+2]]);mesh.positions.set(transformed,i);}
    recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);
  }
  function activeMeshAppearanceAssets(){
    const result=[];
    for(const id of bodySettings.equippedAssets||[]){const item=appearanceById.get(id);if(!item)continue;const hair=['Hair','Facial hair','Eyebrows','Eyelashes'].includes(item.category),dark=['Eyewear'].includes(item.category),eyes=item.category==='Eyes';result.push({id,colour:eyes?(bodySettings.eyeColor||'#514c48'):hair?'#35261f':dark?'#20262d':'#2e4551',fabric:hair?0:.85,category:item.category});}
    return result;
  }
  function renderMeshAppearanceAssets(){
    if(software)return;const active=activeMeshAppearanceAssets();if(!active.length)return;ensureMeshAppearanceProgram();const pgr=meshAppearanceProgram;gl.useProgram(pgr.instance);gl.uniformMatrix4fv(pgr.vp,false,viewProjection);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    for(const entry of active){const mesh=ensureMeshAppearanceAsset(entry.id);if(!mesh)continue;updateMeshAppearanceAsset(mesh);const eyes=entry.category==='Eyes',source=eyes?[1,1,1]:mesh.material.diffuseColor,colour=source?.length>=3?[source[0],source[1],source[2],Number.isFinite(mesh.material.opacity)?mesh.material.opacity:1]:colour4(entry.colour||'#2e4551'),accent=eyes?colour4(bodySettings.eyeColor||'#514c48'):colour4('#d0a36f');gl.uniform4fv(pgr.colour,colour);gl.uniform3fv(pgr.accent,accent.slice(0,3));gl.uniform1f(pgr.fabric,entry.fabric);gl.uniform1f(pgr.useTexture,mesh.textureReady?1:0);gl.uniform1f(pgr.shininess,clamp(Number(mesh.material.shininess)||0,0,1));gl.uniform1f(pgr.eye,eyes?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.uniform1i(pgr.texture,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.vertexAttribPointer(pgr.pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.pos);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.vertexAttribPointer(pgr.norm,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.norm);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.ub);gl.vertexAttribPointer(pgr.uv,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.uv);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.indexType,0);}gl.disable(gl.BLEND);
  }

  refreshTexture = function refreshTextureV6(p) {
    const ctx = p.ctx, W = p.canvas.width, H = p.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = ({
      skin: bodySettings.skinTone || '#dfc8b3', cloth: '#82909c', brief: '#272d35', areola: '#c29a88', nipple: '#ae8172',
      navel: '#8e6c5b', shadow: '#9d796a', eyewhite: '#d8c5af', iris: '#514c48', brow: '#8e7064', lip: '#ba9485'
    }[p.color] || '#dfc8b3');
    ctx.fillRect(0, 0, W, H);
    if (p.color === 'brief') {
      ctx.fillStyle = '#343c46';
      ctx.fillRect(0, 0, W, Math.max(3, H * .025));
    }
    for (const copy of (importedRig ? [] : decalsForPart(p))) {
      const tattoo = copy.tattoo;
      const asset = assetMap()[tattoo.asset];
      const image = imgCache[tattoo.asset];
      if (!asset || !image || !image.complete || !image.naturalWidth) continue;
      const u = copy.u * W, v = (1 - copy.v) * H, w = copy.size * W, ratio = asset.ratio || 1;
      const h = clamp(copy.size * p.circumference / (p.length * ratio), .006, 1.25) * H;
      const source = tattoo.colorMode === 'mono' ? tintedImage(image, tattoo.inkColor || '#171717') : image;
      for (const offset of [-W, 0, W]) {
        ctx.save();
        ctx.translate(u + offset, v);
        ctx.rotate(tattoo.rotation * Math.PI / 180);
        ctx.globalAlpha = tattoo.opacity ?? .91;
        ctx.filter = `saturate(${tattoo.saturation ?? 100}%) hue-rotate(${tattoo.hue ?? 0}deg)`;
        ctx.drawImage(source, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, p.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.canvas);
    p.dirty = false;
  };

  nearestTattoo = function nearestTattooAcrossSeams(hit) {
    if (!hit) return null;
    const part = partById[hit.part];
    if (!part) return null;
    let best = null, bestDistance = Infinity;
    for (const copy of decalsForPart(part)) {
      const asset = assetMap()[copy.tattoo.asset], ratio = asset?.ratio || 1;
      const width = copy.size / 2, height = clamp(copy.size * part.circumference / (part.length * ratio), .006, 1.25) / 2;
      const deltaU = Math.min(Math.abs(copy.u - hit.u), 1 - Math.abs(copy.u - hit.u)), deltaV = Math.abs(copy.v - hit.v);
      const score = Math.hypot(deltaU / (width + .01), deltaV / (height + .012));
      if (score < bestDistance) { bestDistance = score; best = copy.tattoo; }
    }
    return bestDistance < 1.6 ? best : null;
  };

  /* Projected decal meshes replace the region texture atlas on the imported body.
     Each grid point is bound barycentrically to the closest neutral-pose triangle,
     so artwork crosses atlas seams and follows the actual skinned surface. */
  const decalMeshes = new Map();
  let decalSpatial = null, decalSpatialSerial = 0;
  const decalCell = .17;
  const cellKey = (x, y, z) => `${Math.floor(x / decalCell)},${Math.floor(y / decalCell)},${Math.floor(z / decalCell)}`;

  function closestTrianglePoint(point, a, b, c) {
    const ab = sub(b, a), ac = sub(c, a), ap = sub(point, a), d1 = dot(ab, ap), d2 = dot(ac, ap);
    if (d1 <= 0 && d2 <= 0) return { point: a, weights: [1, 0, 0] };
    const bp = sub(point, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) return { point: b, weights: [0, 1, 0] };
    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return { point: add(a, scale(ab, v)), weights: [1 - v, v, 0] }; }
    const cp = sub(point, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
    if (d6 >= 0 && d5 <= d6) return { point: c, weights: [0, 0, 1] };
    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return { point: add(a, scale(ac, w)), weights: [1 - w, 0, w] }; }
    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return { point: add(b, scale(sub(c, b), w)), weights: [0, 1 - w, w] }; }
    const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom;
    return { point: add(a, add(scale(ab, v), scale(ac, w))), weights: [1 - v - w, v, w] };
  }

  function ensureDecalSpatial() {
    if (!importedRig || decalSpatial?.rig === importedRig) return decalSpatial;
    const positions = importedRig.geometry.v, triangles = importedRig.geometry.tri;
    const vertexNormals = new Float32Array(positions.length), triNormals = new Float32Array(triangles.length), triRegions = new Array(triangles.length / 3);
    const cells = new Map();
    for (let k = 0; k < triangles.length; k += 3) {
      const ia = triangles[k], ib = triangles[k + 1], ic = triangles[k + 2];
      const a = [positions[ia * 3], positions[ia * 3 + 1], positions[ia * 3 + 2]], b = [positions[ib * 3], positions[ib * 3 + 1], positions[ib * 3 + 2]], c = [positions[ic * 3], positions[ic * 3 + 1], positions[ic * 3 + 2]];
      const n = normal(cross(sub(b, a), sub(c, a))); triNormals.set(n, k);
      triRegions[k / 3] = rigGroupAt((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
      for (const i of [ia, ib, ic]) { vertexNormals[i * 3] += n[0]; vertexNormals[i * 3 + 1] += n[1]; vertexNormals[i * 3 + 2] += n[2]; }
      const keys = new Set([cellKey(...a), cellKey(...b), cellKey(...c), cellKey((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3)]);
      for (const key of keys) { if (!cells.has(key)) cells.set(key, []); cells.get(key).push(k); }
    }
    for (let i = 0; i < vertexNormals.length; i += 3) { const n = normal([vertexNormals[i], vertexNormals[i + 1], vertexNormals[i + 2]]); vertexNormals.set(n, i); }
    decalSpatial = { rig: importedRig, positions, triangles, triNormals, vertexNormals, triRegions, cells, serial: ++decalSpatialSerial };
    for (const mesh of decalMeshes.values()) mesh.signature = '';
    return decalSpatial;
  }

  function neutralSurfaceAt(part, u, v) {
    const spatial = ensureDecalSpatial();
    if (!spatial || !part?.sourceIndices) return null;
    let best = Infinity, local = 0;
    for (let i = 0; i < part.uvs.length; i += 2) {
      let du = Math.abs(u - part.uvs[i]); du = Math.min(du, Math.abs(du - 1));
      const dv = (v - part.uvs[i + 1]) * 1.15, distance = du * du + dv * dv;
      if (distance < best) { best = distance; local = i / 2; }
    }
    const source = part.sourceIndices[local], p = [spatial.positions[source * 3], spatial.positions[source * 3 + 1], spatial.positions[source * 3 + 2]], n = [spatial.vertexNormals[source * 3], spatial.vertexNormals[source * 3 + 1], spatial.vertexNormals[source * 3 + 2]];
    return { source, point: p, normal: n };
  }

  const adjacentDecalRegions = {
    torso: ['torso', 'pelvis', 'neck', 'left_upper_arm', 'right_upper_arm'], pelvis: ['pelvis', 'torso', 'left_thigh', 'right_thigh'],
    neck: ['neck', 'head', 'torso'], head: ['head', 'neck'],
    left_upper_arm: ['left_upper_arm', 'torso', 'left_forearm'], right_upper_arm: ['right_upper_arm', 'torso', 'right_forearm'],
    left_forearm: ['left_forearm', 'left_upper_arm', 'left_hand'], right_forearm: ['right_forearm', 'right_upper_arm', 'right_hand'],
    left_hand: ['left_hand', 'left_forearm'], right_hand: ['right_hand', 'right_forearm'],
    left_thigh: ['left_thigh', 'pelvis', 'left_calf'], right_thigh: ['right_thigh', 'pelvis', 'right_calf'],
    left_calf: ['left_calf', 'left_thigh', 'left_foot'], right_calf: ['right_calf', 'right_thigh', 'right_foot'],
    left_foot: ['left_foot', 'left_calf'], right_foot: ['right_foot', 'right_calf']
  };

  function closestSurfaceBinding(point, facing, maximumDistance, sourceRegion) {
    const spatial = decalSpatial, base = point.map(value => Math.floor(value / decalCell)), visited = new Set();
    const radiusLimit = Math.min(6, Math.max(2, Math.ceil(maximumDistance / decalCell) + 1)), allowed = new Set(adjacentDecalRegions[sourceRegion] || [sourceRegion]);
    let best = null, bestScore = Infinity;
    search: for (let radius = 0; radius <= radiusLimit; radius++) {
      for (let x = -radius; x <= radius; x++) for (let y = -radius; y <= radius; y++) for (let z = -radius; z <= radius; z++) {
        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== radius) continue;
        for (const k of spatial.cells.get(`${base[0] + x},${base[1] + y},${base[2] + z}`) || []) {
          if (visited.has(k)) continue; visited.add(k);
          const triangle = spatial.triangles, positions = spatial.positions, ids = [triangle[k], triangle[k + 1], triangle[k + 2]];
          const n = [spatial.triNormals[k], spatial.triNormals[k + 1], spatial.triNormals[k + 2]], alignment = dot(n, facing);
          if (alignment < .04 || !allowed.has(spatial.triRegions[k / 3])) continue;
          const pts = ids.map(i => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]), closest = closestTrianglePoint(point, pts[0], pts[1], pts[2]);
          const distance = Math.hypot(...sub(closest.point, point)), regionPenalty = spatial.triRegions[k / 3] === sourceRegion ? 0 : .018, score = distance + (1 - alignment) * .065 + regionPenalty;
          if (distance <= maximumDistance && score < bestScore) { bestScore = score; best = { ids, weights: closest.weights }; }
        }
      }
      if (best && radius >= 1 && (bestScore < .14 || radius * decalCell > bestScore + decalCell * 1.35)) break search;
    }
    return best;
  }

  function bindingPosition(binding) {
    if (!binding) return null; const spatial = ensureDecalSpatial(), point = [0, 0, 0];
    for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) point[q] += spatial.positions[binding.ids[j] * 3 + q] * binding.weights[j];
    return point;
  }

  function bindingNormal(binding) {
    if (!binding) return null; const spatial = ensureDecalSpatial(), result = [0, 0, 0];
    for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) result[q] += spatial.vertexNormals[binding.ids[j] * 3 + q] * binding.weights[j];
    return normal(result);
  }

  const decalUVMaps = new WeakMap();
  function ensurePartUVMap(part) {
    let map = decalUVMaps.get(part); if (map) return map;
    const cells = new Map(), resolution = 32, triangles = [];
    const put = (x, y, index) => { const key = `${x},${y}`; if (!cells.has(key)) cells.set(key, []); cells.get(key).push(index); };
    for (let k = 0; k < part.indices.length; k += 3) {
      const local = [part.indices[k], part.indices[k + 1], part.indices[k + 2]], uv = local.map(i => [part.uvs[i * 2], part.uvs[i * 2 + 1]]);
      let minU = Math.min(...uv.map(q => q[0])), maxU = Math.max(...uv.map(q => q[0]));
      if (maxU - minU > .5) { for (const q of uv) if (q[0] < .5) q[0] += 1; minU = Math.min(...uv.map(q => q[0])); maxU = Math.max(...uv.map(q => q[0])); }
      const index = triangles.length;
      triangles.push({ local, ids: local.map(i => part.sourceIndices[i]), uv });
      const minV = Math.max(0, Math.min(...uv.map(q => q[1]))), maxV = Math.min(1, Math.max(...uv.map(q => q[1])));
      for (let x = Math.floor(minU * resolution); x <= Math.floor(maxU * resolution); x++) for (let y = Math.floor(minV * resolution); y <= Math.floor(maxV * resolution); y++) put(x, y, index);
    }
    map = { cells, triangles, resolution }; decalUVMaps.set(part, map); return map;
  }

  function uvBinding(part, u, v) {
    if (!part?.sourceIndices || v < -.0001 || v > 1.0001) return null;
    const map = ensurePartUVMap(part), eps = 1e-5;
    for (const queryU of [u, u + 1, u - 1]) {
      const key = `${Math.floor(queryU * map.resolution)},${Math.floor(clamp(v, 0, 1) * map.resolution)}`;
      for (const index of map.cells.get(key) || []) {
        const tri = map.triangles[index], [a, b, c] = tri.uv;
        const denom = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(denom) < 1e-10) continue;
        const w0 = ((b[1] - c[1]) * (queryU - c[0]) + (c[0] - b[0]) * (v - c[1])) / denom;
        const w1 = ((c[1] - a[1]) * (queryU - c[0]) + (a[0] - c[0]) * (v - c[1])) / denom, w2 = 1 - w0 - w1;
        if (w0 >= -eps && w1 >= -eps && w2 >= -eps) return { ids: tri.ids, weights: [w0, w1, w2] };
      }
    }
    return null;
  }

  function nearestUVBinding(part, u, v) {
    if (!part?.sourceIndices) return null;
    const map = ensurePartUVMap(part), queryV = clamp(v, 0, 1); let best = null, bestDistance = Infinity;
    for (const queryU of [u, u + 1, u - 1]) {
      const cx = Math.floor(queryU * map.resolution), cy = Math.floor(queryV * map.resolution), visited = new Set();
      for (let radius = 0; radius <= 4; radius++) for (let x = -radius; x <= radius; x++) for (let y = -radius; y <= radius; y++) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
        for (const index of map.cells.get(`${cx + x},${cy + y}`) || []) {
          if (visited.has(index)) continue; visited.add(index); const tri = map.triangles[index];
          const closest = closestTrianglePoint([queryU, queryV, 0], [tri.uv[0][0], tri.uv[0][1], 0], [tri.uv[1][0], tri.uv[1][1], 0], [tri.uv[2][0], tri.uv[2][1], 0]);
          const distance = Math.hypot(closest.point[0] - queryU, closest.point[1] - queryV);
          if (distance < bestDistance) { bestDistance = distance; best = { ids: tri.ids, weights: closest.weights }; }
        }
        if (best && bestDistance < (radius + 1) / map.resolution) break;
      }
    }
    return bestDistance < .19 ? best : null;
  }

  function bindingAcrossRegion(part, u, v) {
    const direct = uvBinding(part, u, v); if (direct) return direct;
    if (v >= 0 && v <= 1) return nearestUVBinding(part, u, v);
    const edge = v < 0 ? 'low' : 'high', overshoot = v < 0 ? -v : v - 1;
    const candidates = seamLinks.filter(link => link[0] === part.id && link[1] === edge).map(link => {
      const target = partById[link[2]]; if (!target) return null;
      const mapped = overshoot * part.length / target.length, targetV = link[3] === 'high' ? 1 - mapped : mapped;
      return { target, targetV, binding: uvBinding(target, u, targetV) || nearestUVBinding(target, u, targetV) };
    }).filter(candidate => candidate?.binding);
    if (candidates.length <= 1) return candidates[0]?.binding || null;
    const sourceEdge = neutralSurfaceAt(part, u, edge === 'low' ? .001 : .999)?.point;
    candidates.sort((a, b) => {
      const ap = neutralSurfaceAt(a.target, u, a.targetV)?.point, bp = neutralSurfaceAt(b.target, u, b.targetV)?.point;
      return Math.hypot(...sub(ap || [99, 99, 99], sourceEdge || [0, 0, 0])) - Math.hypot(...sub(bp || [99, 99, 99], sourceEdge || [0, 0, 0]));
    });
    return candidates[0].binding;
  }

  function buildDecalBinding(tattoo, part, asset) {
    const angle = tattoo.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
    const width = Math.max(.025, tattoo.size * part.circumference), height = width / (asset.ratio || 1), curved = /head|pelvis|upper_arm|torso/.test(part.id), grid = matchMedia('(max-width: 780px)').matches ? (curved ? 13 : 11) : (curved ? 15 : 13), nodes = [], uvs = new Float32Array(grid * grid * 2);
    const centerBinding = uvBinding(part, tattoo.u, tattoo.v); if (!centerBinding) return null;
    const center = bindingPosition(centerBinding), facing = bindingNormal(centerBinding); if (!center || !facing) return null;
    const du = .014, dv = .014, uBefore = bindingPosition(uvBinding(part, tattoo.u - du, tattoo.v)), uAfter = bindingPosition(uvBinding(part, tattoo.u + du, tattoo.v));
    const vBefore = bindingPosition(uvBinding(part, tattoo.u, clamp(tattoo.v - dv, 0, 1))), vAfter = bindingPosition(uvBinding(part, tattoo.u, clamp(tattoo.v + dv, 0, 1)));
    let vertical = vBefore && vAfter ? sub(vAfter, vBefore) : [0, 1, 0]; vertical = sub(vertical, scale(facing, dot(vertical, facing)));
    if (Math.hypot(...vertical) < 1e-5) vertical = sub([0, 1, 0], scale(facing, facing[1])); vertical = normal(vertical);
    let horizontal = normal(cross(vertical, facing));
    if (uBefore && uAfter) { const uDirection = sub(uAfter, uBefore); if (dot(horizontal, uDirection) < 0) horizontal = scale(horizontal, -1); }
    const maximumDistance = clamp(Math.max(width, height) * .72, .20, .82);
    for (let row = 0; row < grid; row++) for (let col = 0; col < grid; col++) {
      const u = col / (grid - 1), v = row / (grid - 1), x = (u - .5) * width, y = (v - .5) * height;
      const rotatedX = x * c - y * s, rotatedY = x * s + y * c;
      const target = add(center, add(scale(horizontal, rotatedX), scale(vertical, rotatedY)));
      const projected = closestSurfaceBinding(target, facing, maximumDistance, part.id), fallback = bindingAcrossRegion(part, tattoo.u + rotatedX / part.circumference, tattoo.v + rotatedY / part.length);
      nodes.push(projected || fallback || centerBinding); uvs.set([u, v], (row * grid + col) * 2);
    }
    const indices = [];
    for (let row = 0; row < grid - 1; row++) for (let col = 0; col < grid - 1; col++) {
      const a = row * grid + col, b = a + 1, d = (row + 1) * grid + col, cidx = d + 1;
      if (nodes[a] && nodes[b] && nodes[cidx] && nodes[d]) indices.push(a, b, cidx, a, cidx, d);
    }
    return { nodes, uvs, indices: new Uint16Array(indices), grid };
  }

  let decalProgram = null;
  function ensureDecalProgram() {
    if (software || decalProgram) return;
    const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uViewProjection;varying vec3 vNormal;varying vec2 vUV;void main(){vNormal=aNormal;vUV=aUV;gl_Position=uViewProjection*vec4(aPosition,1.);}`;
    const fragment = `precision mediump float;uniform sampler2D uTexture;uniform float uOpacity;uniform float uAnalysis;uniform vec3 uAnalysisColor;varying vec3 vNormal;varying vec2 vUV;void main(){vec4 ink=texture2D(uTexture,vUV);if(ink.a<.025)discard;vec3 n=normalize(vNormal);float light=.68+.24*max(0.,dot(n,normalize(vec3(-.55,.8,1.1))))+.08*max(0.,dot(n,normalize(vec3(.7,.25,.4))));vec3 base=ink.rgb*light;gl_FragColor=vec4(mix(base,uAnalysisColor,uAnalysis*.48),ink.a*uOpacity);}`;
    decalProgram = gl.createProgram(); gl.attachShader(decalProgram, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(decalProgram, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(decalProgram);
    decalProgram.locations = { pos: gl.getAttribLocation(decalProgram, 'aPosition'), norm: gl.getAttribLocation(decalProgram, 'aNormal'), uv: gl.getAttribLocation(decalProgram, 'aUV'), vp: gl.getUniformLocation(decalProgram, 'uViewProjection'), opacity: gl.getUniformLocation(decalProgram, 'uOpacity'), analysis: gl.getUniformLocation(decalProgram, 'uAnalysis'), analysisColor: gl.getUniformLocation(decalProgram, 'uAnalysisColor') };
  }

  function uploadDecalTexture(mesh, tattoo, asset, image) {
    const signature = `${tattoo.colorMode}|${tattoo.inkColor}|${tattoo.saturation}|${tattoo.hue}|${tattoo.healing || 'healed'}|${tattoo.inkDensity ?? 88}|${tattoo.mask || 'none'}|${asset.src.length}|${image.naturalWidth}x${image.naturalHeight}`;
    if (mesh.textureSignature === signature) return;
    if (!mesh.texture) mesh.texture = gl.createTexture();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512; const ctx = canvas.getContext('2d');
    const source = tattoo.colorMode === 'mono' ? tintedImage(image, tattoo.inkColor || '#171717') : image;
    const healing = tattoo.healing || 'healed', healingFilter = healing === 'fresh' ? 'saturate(112%) contrast(108%)' : healing === 'aged' ? 'saturate(58%) contrast(88%) brightness(108%) blur(.35px)' : healing === 'faded' ? 'saturate(42%) contrast(76%) brightness(114%) blur(.55px)' : 'saturate(94%) contrast(96%)';
    ctx.filter = `saturate(${tattoo.saturation ?? 100}%) hue-rotate(${tattoo.hue ?? 0}deg) ${healingFilter}`; const density=clamp((tattoo.inkDensity ?? 88)/100,.45,1.15);ctx.globalAlpha = Math.min(1,(healing === 'fresh' ? 1 : healing === 'aged' ? .72 : healing === 'faded' ? .52 : .88)*density); ctx.drawImage(source, 0, 0, 512, 512); ctx.globalAlpha = 1;
    if (tattoo.mask && tattoo.mask !== 'none') {
      ctx.globalCompositeOperation = 'destination-in'; ctx.filter = 'none';
      if (tattoo.mask === 'ellipse') { ctx.beginPath(); ctx.ellipse(256, 256, 230, 246, 0, 0, Math.PI * 2); ctx.fill(); }
      else { const gradient = ctx.createLinearGradient(0, 64, 0, 480); gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(.22, '#000'); gradient.addColorStop(.78, '#000'); gradient.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (asset.reference && tattoo.colorMode !== 'mono') {
      const pixels = ctx.getImageData(0, 0, 512, 512), data = pixels.data, corners = [[2, 2], [509, 2], [2, 509], [509, 509]];
      const background = [0, 1, 2].map(channel => corners.reduce((sum, [x, y]) => sum + data[(y * 512 + x) * 4 + channel], 0) / corners.length);
      for (let i = 0; i < data.length; i += 4) {
        const distance = Math.hypot(data[i] - background[0], data[i + 1] - background[1], data[i + 2] - background[2]);
        data[i + 3] = Math.round(data[i + 3] * clamp((distance - 9) / 42, 0, 1));
      }
      ctx.putImageData(pixels, 0, 0);
    }
    gl.bindTexture(gl.TEXTURE_2D, mesh.texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    mesh.textureSignature = signature;
  }

  function ensureDecalMesh(tattoo) {
    const part = partById[tattoo.part], asset = assetMap()[tattoo.asset], image = imgCache[tattoo.asset], spatial = ensureDecalSpatial();
    if (!part || !asset || !spatial || !image?.complete || !image.naturalWidth) return null;
    let mesh = decalMeshes.get(tattoo.id); if (!mesh) { mesh = {}; decalMeshes.set(tattoo.id, mesh); }
    const signature = `${spatial.serial}|${tattoo.part}|${tattoo.u.toFixed(5)}|${tattoo.v.toFixed(5)}|${tattoo.size.toFixed(5)}|${tattoo.rotation.toFixed(2)}|${asset.ratio}`;
    if (mesh.signature !== signature) {
      const binding = buildDecalBinding(tattoo, part, asset); if (!binding) return null;
      Object.assign(mesh, binding); mesh.signature = signature; mesh.positions = new Float32Array(binding.nodes.length * 3); mesh.normals = new Float32Array(binding.nodes.length * 3);
      mesh.pb ||= gl.createBuffer(); mesh.nb ||= gl.createBuffer(); mesh.ub ||= gl.createBuffer(); mesh.ib ||= gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.ub); gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    }
    uploadDecalTexture(mesh, tattoo, asset, image); return mesh;
  }

  function updateDecalPose(mesh) {
    for (let i = 0; i < mesh.nodes.length; i++) {
      const node = mesh.nodes[i]; if (!node) continue;
      const points = node.ids.map(index => importedRig.worldPoint(index)), p = [0, 0, 0];
      for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) p[q] += points[j][q] * node.weights[j];
      const n = normal(cross(sub(points[1], points[0]), sub(points[2], points[0]))); mesh.positions.set(add(p, scale(n, .008)), i * 3); mesh.normals.set(n, i * 3);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb); gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb); gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.DYNAMIC_DRAW);
    mesh.analysis = measureMeshDistortion(mesh);
  }

  function measureMeshDistortion(mesh) {
    const spatial = ensureDecalSpatial(); if (!spatial || !mesh?.nodes?.length) return { max: 0, average: 0, grade: 'good' };
    if (!mesh.neutralPositions || mesh.neutralPositions.length !== mesh.positions.length) {
      mesh.neutralPositions = new Float32Array(mesh.positions);
    }
    const changes = [], edge = (a, b) => { if (!mesh.nodes[a] || !mesh.nodes[b]) return; const distance = (array, i, j) => Math.hypot(array[i * 3] - array[j * 3], array[i * 3 + 1] - array[j * 3 + 1], array[i * 3 + 2] - array[j * 3 + 2]); const rest = distance(mesh.neutralPositions, a, b); if (rest > 1e-5) changes.push(Math.abs(distance(mesh.positions, a, b) / rest - 1)); };
    for (let row = 0; row < mesh.grid; row++) for (let col = 0; col < mesh.grid; col++) { const i = row * mesh.grid + col; if (col + 1 < mesh.grid) edge(i, i + 1); if (row + 1 < mesh.grid) edge(i, i + mesh.grid); }
    changes.sort((a, b) => a - b); const max = changes[Math.floor(Math.max(0, changes.length - 1) * .92)] || 0, average = changes.reduce((sum, value) => sum + value, 0) / (changes.length || 1);
    return { max, average, percent: Math.round(max * 100), grade: max > .24 ? 'high' : max > .11 ? 'moderate' : 'good' };
  }

  function measureTattooDistortion(tattoo) { const mesh = ensureDecalMesh(tattoo); if (!mesh) return null; updateDecalPose(mesh); return mesh.analysis; }

  function renderProjectedDecals() {
    if (software || !importedRig) return;
    ensureDecalProgram(); const live = new Set(tattoos.map(t => t.id));
    for (const [id, mesh] of decalMeshes) if (!live.has(id)) { for (const buffer of [mesh.pb, mesh.nb, mesh.ub, mesh.ib]) if (buffer) gl.deleteBuffer(buffer); if (mesh.texture) gl.deleteTexture(mesh.texture); decalMeshes.delete(id); }
    gl.useProgram(decalProgram); gl.uniformMatrix4fv(decalProgram.locations.vp, false, viewProjection); gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
    for (const tattoo of tattoos) {
      if (tattoo.hidden) continue;
      const covered = clothingCoverage(tattoo.part, tattoo.v);
      if (covered && !bodySettings.clothingXRay) continue;
      const mesh = ensureDecalMesh(tattoo); if (!mesh || !mesh.indices.length) continue; updateDecalPose(mesh);
      const risk = mesh.analysis?.grade || 'good', riskColour = risk === 'high' ? [.92, .23, .25] : risk === 'moderate' ? [1, .64, .16] : [.28, .78, .48];
      gl.uniform1f(decalProgram.locations.opacity, (tattoo.opacity ?? .92) * (covered ? .24 : 1)); gl.uniform1f(decalProgram.locations.analysis, window.INK_ATLAS_ANALYSIS_ON ? 1 : 0); gl.uniform3fv(decalProgram.locations.analysisColor, riskColour); gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb); gl.vertexAttribPointer(decalProgram.locations.pos, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(decalProgram.locations.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb); gl.vertexAttribPointer(decalProgram.locations.norm, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(decalProgram.locations.norm); gl.bindBuffer(gl.ARRAY_BUFFER, mesh.ub); gl.vertexAttribPointer(decalProgram.locations.uv, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(decalProgram.locations.uv);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib); gl.bindTexture(gl.TEXTURE_2D, mesh.texture); gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.disable(gl.BLEND); gl.depthMask(true);
  }

  const drawSceneBase = drawScene;
  drawScene = function drawSceneWithProjectedDecals() {
    const shouldRender = dirtyScene; drawSceneBase(); if (shouldRender) { renderAppearanceLayers(); renderMeshAppearanceAssets(); renderProjectedDecals(); }
  };

  const originalRenderInspector = renderInspector;
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return `#${[f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
  }

  renderInspector = function renderInspectorV6() {
    originalRenderInspector();
    const tattoo = tattoos.find(t => t.id === selectedId);
    if (!tattoo || tattoo.locked) return;
    const bodyPart = partById[tattoo.part], art = assetMap()[tattoo.asset];
    const sizeLine = document.createElement('div');
    sizeLine.className = 'size-estimate';
    sizeLine.innerHTML = '<span>Calibrated tattoo width</span><label class="cm-entry"><input id="tattooWidthCm" aria-label="Tattoo width in centimetres" type="number" min="1" max="95" step="0.1"><b>cm</b></label><small id="tattooMetricDetail"></small>';
    const centimetresPerUnit = bodySettings.heightCm / 6.88, input = sizeLine.querySelector('#tattooWidthCm'), detail = sizeLine.querySelector('#tattooMetricDetail');
    const updateSizeEstimate = () => {
      const width = tattoo.size * (bodyPart?.circumference || 1) * centimetresPerUnit;
      const height = width / (art?.ratio || 1);
      if (document.activeElement !== input) input.value = width.toFixed(1);
      detail.textContent = `${height.toFixed(1)} cm high · scale calibrated to a ${bodySettings.heightCm} cm body`;
    };
    updateSizeEstimate();
    $('inspector').appendChild(sizeLine);
    input.oninput = () => {
      const wanted = clamp(Number(input.value) || 1, 1, 95);
      tattoo.size = clamp(wanted / ((bodyPart?.circumference || 1) * centimetresPerUnit), .035, .78);
      if ($('sizeRange')) $('sizeRange').value = tattoo.size;
      if ($('sizeOut')) $('sizeOut').textContent = `${Math.round(tattoo.size * 100)}%`;
      detail.textContent = `${(wanted / (art?.ratio || 1)).toFixed(1)} cm high · scale calibrated to a ${bodySettings.heightCm} cm body`;
      markDirty(tattoo.part);
    };
    input.onchange = () => { saveLayout(false); updateSizeEstimate(); };
    $('sizeRange')?.addEventListener('input', updateSizeEstimate);
    if (tattoo.protected) return;
    const panel = document.createElement('div');
    panel.className = 'ink-panel';
    panel.innerHTML = `
      <div class="ink-panel-head"><span>Colour &amp; ink</span><select class="ink-mode" id="inkMode"><option value="original" ${tattoo.colorMode !== 'mono' ? 'selected' : ''}>Original colours</option><option value="mono" ${tattoo.colorMode === 'mono' ? 'selected' : ''}>Single ink</option></select></div>
      <div class="colour-wheel-control">
        <div class="colour-wheel" id="inkColourWheel" role="slider" aria-label="Ink colour wheel" aria-valuetext="${tattoo.inkColor || '#171717'}" tabindex="0"><i></i></div>
        <div class="colour-wheel-copy"><strong>Full colour wheel</strong><span>Drag around the wheel, or choose an exact colour.</span><label>Exact ink <input id="inkColourNative" type="color" value="${tattoo.inkColor || '#171717'}"></label></div>
      </div>
      <div class="control"><label for="saturationRange">Saturation</label><input id="saturationRange" type="range" min="0" max="180" step="1" value="${tattoo.saturation ?? 100}"><output id="saturationOut">${tattoo.saturation ?? 100}%</output></div>
      <div class="control"><label for="hueRange">Hue</label><input id="hueRange" type="range" min="-180" max="180" step="1" value="${tattoo.hue ?? 0}"><output id="hueOut">${tattoo.hue ?? 0}°</output></div>`;
    $('inspector').appendChild(panel);
    $('inkMode').onchange = e => { tattoo.colorMode = e.target.value; markDirty(tattoo.part); renderInspector(); saveLayout(false); };
    const wheel = $('inkColourWheel');
    const applyWheelColour = (colour, x = 50, y = 50) => {
      tattoo.colorMode = 'mono'; tattoo.inkColor = colour;
      wheel.style.setProperty('--wheel-x', `${x}%`); wheel.style.setProperty('--wheel-y', `${y}%`);
      wheel.style.setProperty('--ink-colour', colour); wheel.setAttribute('aria-valuetext', colour);
      $('inkColourNative').value = colour; $('inkMode').value = 'mono'; markDirty(tattoo.part); requestDraw();
    };
    const pickFromWheel = event => {
      const rect = wheel.getBoundingClientRect(), radius = rect.width / 2;
      let dx = event.clientX - rect.left - radius, dy = event.clientY - rect.top - radius;
      const distance = Math.hypot(dx, dy), scale = distance > radius ? radius / distance : 1; dx *= scale; dy *= scale;
      const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, saturation = Math.min(100, Math.hypot(dx, dy) / radius * 100);
      applyWheelColour(hslToHex(hue, saturation, 43), 50 + dx / radius * 50, 50 + dy / radius * 50);
    };
    wheel.addEventListener('pointerdown', event => { wheel.setPointerCapture(event.pointerId); pickFromWheel(event); });
    wheel.addEventListener('pointermove', event => { if (wheel.hasPointerCapture(event.pointerId)) pickFromWheel(event); });
    wheel.addEventListener('pointerup', event => { if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId); saveLayout(false); });
    $('inkColourNative').oninput = event => applyWheelColour(event.target.value);
    $('inkColourNative').onchange = () => saveLayout(false);
    wheel.style.setProperty('--ink-colour', tattoo.inkColor || '#171717');
    const bindInk = (id, prop, out, suffix) => {
      $(id).oninput = e => { tattoo[prop] = Number(e.target.value); $(out).textContent = `${tattoo[prop]}${suffix}`; markDirty(tattoo.part); };
      $(id).onchange = () => saveLayout(false);
    };
    bindInk('saturationRange', 'saturation', 'saturationOut', '%');
    bindInk('hueRange', 'hue', 'hueOut', '°');
  };

  document.addEventListener('input', event => {
    if (event.target.id !== 'tattooWidthCm') return;
    const tattoo = tattoos.find(t => t.id === selectedId), part = tattoo && partById[tattoo.part], art = tattoo && assetMap()[tattoo.asset];
    if (!tattoo || !part) return;
    const wanted = clamp(Number(event.target.value) || 1, 1, 95), centimetresPerUnit = bodySettings.heightCm / 6.88;
    tattoo.size = clamp(wanted / (part.circumference * centimetresPerUnit), .035, .78);
    if ($('sizeRange')) $('sizeRange').value = tattoo.size;
    if ($('sizeOut')) $('sizeOut').textContent = `${Math.round(tattoo.size * 100)}%`;
    if ($('tattooMetricDetail')) $('tattooMetricDetail').textContent = `${(wanted / (art?.ratio || 1)).toFixed(1)} cm high · scale calibrated to a ${bodySettings.heightCm} cm body`;
    markDirty(tattoo.part);
  });
  document.addEventListener('change', event => { if (event.target.id === 'tattooWidthCm') saveLayout(false); });

  saveLayout = function saveLayoutV6(showToast = true) {
    try {
      const customAssets = ASSETS.filter(a => a.cat === 'Uploads' || a.cat === 'Generated');
      const savedAt = new Date();
      const obj = { version: 7, date: savedAt.toISOString(), pose, tattoos, customAssets, bodySettings };
      localStorage.setItem(STORE, JSON.stringify(obj));
      const status = $('saveStatus');
      if (status) {
        status.textContent = `Saved · ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        status.dataset.saved = 'true';
      }
      if (showToast) toast('Layout saved in this browser');
    } catch (error) {
      if (showToast) toast('Browser storage full — export a JSON backup instead');
    }
  };

  function installProgressSaving() {
    const saveButton = $('saveBtn');
    const status = document.createElement('span');
    status.id = 'saveStatus';
    status.className = 'save-status';
    status.textContent = stateRestored ? 'Restored' : 'Autosave on';
    saveButton.before(status);
    saveButton.textContent = 'Save progress';
    document.addEventListener('change', event => {
      if (event.target.matches('input, select, textarea')) saveLayout(false);
    });
    window.addEventListener('pagehide', () => saveLayout(false));
    setInterval(() => saveLayout(false), 30000);
    $('jsonImport').addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        if (!imported.bodySettings) return;
        const importedModel = imported.bodySettings.modelType === 'female' ? 'female' : imported.bodySettings.modelType === 'male' ? 'male' : null;
        const switchModel = importedModel && importedModel !== bodySettings.modelType;
        if (importedModel) { bodySettings.modelType = importedModel; localStorage.setItem('inkAtlas_body_model', importedModel); }
        if (['balanced', 'athletic', 'broad', 'lean'].includes(imported.bodySettings.profile)) bodySettings.profile = imported.bodySettings.profile;
        if (['balanced', 'soft', 'angular', 'androgynous'].includes(imported.bodySettings.frame)) bodySettings.frame = imported.bodySettings.frame;
        if (/^#[0-9a-f]{6}$/i.test(imported.bodySettings.skinTone || '')) bodySettings.skinTone = imported.bodySettings.skinTone;
        if (Number.isFinite(imported.bodySettings.heightCm)) bodySettings.heightCm = Math.max(130, Math.min(220, imported.bodySettings.heightCm));
        for (const key of ['chestCm', 'waistCm', 'hipsCm', 'bicepsCm', 'thighsCm', 'shoulderCm', 'breastSize']) if (Number.isFinite(imported.bodySettings[key])) bodySettings[key] = imported.bodySettings[key];
        { const importedBreastSize=Number(bodySettings.breastSize); bodySettings.breastSize=Number.isFinite(importedBreastSize)?Math.max(0,Math.min(200,importedBreastSize)):50; }
        for (const key of ['eyeStyle', 'eyebrowStyle', 'eyelashStyle', 'fingerNailStyle', 'toeNailStyle', 'noseShape', 'earShape', 'cheekShape', 'eyeColor', 'clothingXRay', 'renderQuality']) if (imported.bodySettings[key] !== undefined) bodySettings[key] = imported.bodySettings[key];
        bodySettings.equippedAssets = Array.isArray(imported.bodySettings.equippedAssets) ? imported.bodySettings.equippedAssets.filter(id => appearanceById.has(id)).slice(0,20) : [];
        bodySettings.equippedAssets.forEach(id => loadAppearanceAsset(id).catch(error => console.warn(error)));
        window.INK_ATLAS_BODY_PROFILE = bodySettings.profile;
        if ($('bodyProfile')) $('bodyProfile').value = bodySettings.profile;
        if ($('bodyHeight')) $('bodyHeight').value = bodySettings.heightCm;
        if ($('bodyHeightOut')) $('bodyHeightOut').textContent = `${bodySettings.heightCm} cm`;
        applyPose(); renderInspector(); saveLayout(false);
        if (switchModel) setTimeout(() => location.reload(), 140);
      } catch (_) {}
    }, true);
  }

  const setPoseBase = setPose;
  let poseSaveTimer = 0;
  setPose = function setPoseWithAutosave(next) {
    setPoseBase(next);
    clearTimeout(poseSaveTimer);
    poseSaveTimer = setTimeout(() => saveLayout(false), 350);
  };

  $('exportBtn').onclick = () => {
    const obj = {
      format: 'InkAtlas/3', created: new Date().toISOString(), pose, tattoos, bodySettings,
      customAssets: ASSETS.filter(a => a.cat === 'Uploads' || a.cat === 'Generated')
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'ink-atlas-v7-layout.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Tattoo layout exported');
  };

  const originalCanvasTexture = canvasTexture;
  canvasTexture = function canvasTextureV6(p) {
    originalCanvasTexture(p);
    if (matchMedia('(max-width: 780px)').matches && p.paintable && p.canvas.width > 512) {
      p.canvas.width = 512;
      p.canvas.height = 512;
      p.ctx = p.canvas.getContext('2d');
      p.dirty = true;
    }
  };

  function installModelUI() {
    const modelHeading = [...leftRail.querySelectorAll('h2')].find(h => h.textContent.trim() === 'Anatomical body');
    if (modelHeading) modelHeading.textContent = 'Realistic MakeHuman body';
    const uploadBox = $('bodyModelUpload').closest('.uploadbox');
    const controls = document.createElement('div');
    controls.className = 'body-settings';
    controls.innerHTML = `
      <label>Body model
        <select id="bodyModelType"><option value="male">Masculine body</option><option value="female">Feminine body</option></select>
      </label>
      <label>Body profile
        <select id="bodyProfile">
          <option value="balanced">Balanced</option><option value="athletic">Athletic definition</option><option value="broad">Broad build</option><option value="lean">Lean build</option>
        </select>
      </label>
      <label>Height calibration
        <span class="body-height-row"><input id="bodyHeight" type="range" min="140" max="210" step="1" value="${bodySettings.heightCm}"><output id="bodyHeightOut">${bodySettings.heightCm} cm</output></span>
      </label>
      <p class="calibration-copy">Rescales the planning mannequin from the feet upward and recalibrates tattoo dimensions in centimetres.</p>`;
    uploadBox.before(controls);
    $('bodyModelType').value = bodySettings.modelType;
    $('bodyModelType').onchange = event => {
      const next = event.target.value === 'female' ? 'female' : 'male';
      if (next === bodySettings.modelType) return;
      const defaults = next === 'female' ? {heightCm:165,chestCm:91,waistCm:74,hipsCm:99,bicepsCm:28,thighsCm:58,shoulderCm:39,breastSize:50} : {heightCm:178,chestCm:96,waistCm:82,hipsCm:96,bicepsCm:32,thighsCm:56,shoulderCm:44,breastSize:50};
      Object.assign(bodySettings, defaults, { modelType: next });
      localStorage.setItem('inkAtlas_body_model', next); saveLayout(false);
      modelStatus.textContent = `Switching to the ${next === 'female' ? 'feminine' : 'masculine'} body…`;
      setTimeout(() => location.reload(), 120);
    };
    $('bodyProfile').value = bodySettings.profile;
    $('bodyProfile').onchange = event => { bodySettings.profile = event.target.value; window.INK_ATLAS_BODY_PROFILE = bodySettings.profile; applyPose(); for (const mesh of decalMeshes.values()) mesh.neutralPositions = null; saveLayout(false); toast(`${event.target.selectedOptions[0].text} body profile applied`); };
    $('bodyHeight').oninput = event => { const previous = bodySettings.heightCm; bodySettings.heightCm = Number(event.target.value); if (camDist > 9) { const ratio = bodySettings.heightCm / previous; camDist = clamp(camDist * ratio, 9.5, 18.5); camTarget[1] += 3.41 * (bodySettings.heightCm - previous) / 178; } $('bodyHeightOut').textContent = `${bodySettings.heightCm} cm`; applyPose(); for (const mesh of decalMeshes.values()) mesh.neutralPositions = null; parts.forEach(part => part.dirty = true); renderInspector(); updateHeightRuler(); requestDraw(); };
    $('bodyHeight').onchange = () => { saveLayout(false); toast(`Body height and measurement scale set to ${bodySettings.heightCm} cm`); };
    const button = document.createElement('button');
    button.id = 'loadBundledModelBtn';
    button.className = 'btn gold';
    button.style.cssText = 'width:100%;margin:0 0 8px';
    button.textContent = 'Reload high-definition body';
    uploadBox.before(button);
    button.onclick = loadBundledModel;
    const note = document.querySelector('.model-note');
    if (note) {
      note.classList.add('collapsed');
      note.innerHTML = '<button type="button" class="model-note-toggle" aria-expanded="false"><span>Model details</span><b aria-hidden="true">＋</b></button><div class="model-note-body">CC0 MakeHuman-derived body · 163-bone rig · dual-quaternion skinning · pose-space shoulder correctives · seam-aware tattoo projection.</div>';
      const toggle = note.querySelector('.model-note-toggle'), body = note.querySelector('.model-note-body');
      toggle.onclick = () => { const open = note.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.querySelector('b').textContent = open ? '−' : '＋'; body.hidden = !open; };
      body.hidden = true;
    }

    const overlay = document.createElement('div');
    overlay.className = 'model-loading';
    overlay.id = 'modelLoading';
    overlay.innerHTML = '<div class="model-loading-card"><strong>Preparing realistic body</strong><span>Loading the CC0 MakeHuman mesh and mapping its 163-bone rig.</span><div class="model-loading-line"></div></div>';
    canvasWrapV6.appendChild(overlay);
  }

  let heightRuler = null;
  function updateHeightRuler() {
    if (!heightRuler) return;
    heightRuler.querySelector('strong').textContent = `${bodySettings.heightCm} cm`;
    heightRuler.querySelector('span').textContent = `${(bodySettings.heightCm / 100).toFixed(2)} m body scale`;
  }

  function focusBodyRegion(region) {
    const heightScale = bodySettings.heightCm / 178, armFactor = Math.max(pose.leftShoulder || 0, pose.rightShoulder || 0) / 155, legFactor=Math.max(Math.abs(pose.leftHip||0),Math.abs(pose.rightHip||0))/55, scaledY = y => (y + 3.41) * heightScale - 3.41;
    const presets = {
      full: { target: [0, scaledY(.08 + armFactor * .32), 0], distance: clamp((matchMedia('(max-width: 780px)').matches ? 13.8 : 12.7) * heightScale + armFactor * 3.2 + legFactor * 1.4, 11, 18.5), label: 'Full body' },
      head: { target: [0, scaledY(2.82), 0], distance: 3.25, label: 'Head' },
      upper: { target: [0, scaledY(1.92), 0], distance: 5.25, label: 'Upper body' },
      torso: { target: [0, scaledY(.92), 0], distance: 4.55, label: 'Torso' },
      pelvis: { target: [0, scaledY(-.16), 0], distance: 3.8, label: 'Pelvis' },
      legs: { target: [0, scaledY(-1.73), 0], distance: 6.1, label: 'Legs' },
      feet: { target: [0, scaledY(-3.18), .12], distance: 3.35, label: 'Feet' }
    };
    let next = presets[region];
    if (region === 'selected') {
      const tattoo = tattoos.find(t => t.id === selectedId), part = tattoo && partById[tattoo.part];
      if (!part) { toast('Select a tattoo first, then choose Focus selected'); return; }
      next = { target: worldAt(part, tattoo.u, tattoo.v), distance: 3.35, label: 'Selected tattoo' };
    }
    if (!next) return;
    camTarget = [...next.target]; camDist = next.distance; $('viewTitle').textContent = `${next.label} · focused view`; requestDraw();
  }

  function installViewingTools() {
    heightRuler = document.createElement('div');
    heightRuler.className = 'height-ruler';
    heightRuler.innerHTML = '<i></i><div><strong></strong><span></span></div>';
    canvasWrapV6.appendChild(heightRuler); updateHeightRuler();

    const tools = document.createElement('div');
    tools.className = 'focus-tools';
    tools.innerHTML = `<label for="bodyFocus">Focus</label><select id="bodyFocus" aria-label="Focus the camera on a body region"><option value="full">Full body</option><option value="head">Head</option><option value="upper">Upper body</option><option value="torso">Torso</option><option value="pelvis">Pelvis</option><option value="legs">Legs</option><option value="feet">Feet</option><option value="selected">Selected tattoo</option></select>`;
    canvasWrapV6.appendChild(tools);
    $('bodyFocus').onchange = event => focusBodyRegion(event.target.value);
    $('hint').textContent = 'Wheel over a body part to zoom there · Shift-drag to pan · Double-click to focus';

    canvas.addEventListener('wheel', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const rect = canvas.getBoundingClientRect(), px = (event.clientX - rect.left) * canvas.width / rect.width, py = (event.clientY - rect.top) * canvas.height / rect.height;
      if (event.deltaY < 0) {
        const hit = hitModel(px, py);
        if (hit) { const point = worldAt(partById[hit.part], hit.u, hit.v), amount = clamp(.16 + Math.abs(event.deltaY) * .00045, .16, .58); camTarget = camTarget.map((value, i) => value + (point[i] - value) * amount); }
      }
      camDist = clamp(camDist * Math.exp(event.deltaY * .0011), 2.15, 18.5); $('viewTitle').textContent = 'Free orbit · zoom to pointer'; requestDraw();
    }, { capture: true, passive: false });

    canvas.addEventListener('dblclick', event => {
      const rect = canvas.getBoundingClientRect(), hit = hitModel((event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height);
      if (!hit) return; event.preventDefault(); event.stopImmediatePropagation(); camTarget = worldAt(partById[hit.part], hit.u, hit.v); camDist = Math.min(camDist, 3.5); $('viewTitle').textContent = `${nameOf(hit.part)} · focused view`; requestDraw();
    }, true);

    let pan = null;
    canvas.addEventListener('pointerdown', event => {
      if (!(event.shiftKey || event.button === 1)) return;
      event.preventDefault(); event.stopImmediatePropagation(); canvas.setPointerCapture(event.pointerId); pan = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.classList.add('grabbing');
    }, true);
    canvas.addEventListener('pointermove', event => {
      if (!pan || pan.id !== event.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation(); const dx = event.clientX - pan.x, dy = event.clientY - pan.y, sensitivity = camDist * .00145;
      camTarget = add(camTarget, add(scale(cam.right, -dx * sensitivity), scale(cam.up, dy * sensitivity))); camTarget[1] = clamp(camTarget[1], -3.55, 3.55); pan.x = event.clientX; pan.y = event.clientY; $('viewTitle').textContent = 'Free orbit · panned view'; requestDraw();
    }, true);
    const endPan = event => { if (!pan || pan.id !== event.pointerId) return; event.preventDefault(); event.stopImmediatePropagation(); pan = null; canvas.classList.remove('grabbing'); };
    canvas.addEventListener('pointerup', endPan, true); canvas.addEventListener('pointercancel', endPan, true); canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  async function loadBundledModel() {
    const overlay = $('modelLoading');
    const button = $('loadBundledModelBtn');
    const restoredPose = stateRestored ? { ...pose } : null;
    overlay.classList.add('on');
    button.disabled = true;
    modelStatus.textContent = 'Loading bundled realistic body…';
    try {
      let blob;
      if (window.INK_ATLAS_MODEL_BASE64) {
        const encoded = window.INK_ATLAS_MODEL_BASE64;
        const chunks = [];
        for (let offset = 0; offset < encoded.length; offset += 0x8000) {
          const binary = atob(encoded.slice(offset, offset + 0x8000));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          chunks.push(bytes);
        }
        blob = new Blob(chunks, { type: 'model/gltf-binary' });
      } else {
        const response = await fetch(V6.modelURL, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Model request failed (${response.status})`);
        blob = await response.blob();
      }
      const file = new File([blob], V6.modelFile, { type: 'model/gltf-binary' });
      await loadAnatomicalGLB(file);
      if (needsSurfaceCoordinateMigration) migrateLegacySurfaceCoordinates();
      if (restoredPose) setPose(restoredPose);
      $('glCanvas').style.visibility = 'visible';
      const heightScale = bodySettings.heightCm / 178, armFactor = Math.max(pose.leftShoulder || 0, pose.rightShoulder || 0) / 155, legFactor=Math.max(Math.abs(pose.leftHip||0),Math.abs(pose.rightHip||0))/55;
      camTarget = [0, (.08 + armFactor * .32 + 3.41) * heightScale - 3.41, 0];
      camDist = clamp((matchMedia('(max-width: 780px)').matches ? 13.8 : 12.7) * heightScale + armFactor * 3.2 + legFactor * 1.4, 11, 18.5);
      requestDraw();
      modelStatus.textContent = `${V6.modelName} · ${importedRig.vertexCount.toLocaleString()} vertices · ${importedRig.faceCount.toLocaleString()} triangles · dual-quaternion skinning.`;
      button.textContent = 'Reload realistic body';
    } catch (error) {
      modelStatus.textContent = error.message;
      $('glCanvas').style.visibility = 'hidden';
      toast('The high-definition body could not load. Use Reload to try again.');
      console.error(error);
    } finally {
      overlay.classList.remove('on');
      button.disabled = false;
    }
  }

  function migrateLegacySurfaceCoordinates() {
    const templates = Object.fromEntries(buildParts().map(part => [part.id, part]));
    for (const tattoo of tattoos) {
      const part = partById[tattoo.part], template = templates[tattoo.part] || templates.torso;
      if (!part?.restPositions || !template) continue;
      let best = Infinity, bestIndex = -1;
      for (let i = 0; i < part.restPositions.length; i += 3) {
        const point = [part.restPositions[i], part.restPositions[i + 1], part.restPositions[i + 2]], row = loftRowAt(template, point[1]);
        const legacyU = (Math.atan2(point[0] - row[1], point[2] - row[2]) / (2 * Math.PI) + 1.5) % 1, legacyV = clamp((point[1] - template.ymin) / template.length, 0, 1);
        let du = Math.abs(tattoo.u - legacyU); du = Math.min(du, 1 - du); const dv = (tattoo.v - legacyV) * 1.15, distance = du * du + dv * dv;
        if (distance < best) { best = distance; bestIndex = i / 3; }
      }
      if (bestIndex >= 0) { tattoo.u = ((part.uvs[bestIndex * 2] % 1) + 1) % 1; tattoo.v = clamp(part.uvs[bestIndex * 2 + 1], .002, .998); }
    }
    needsSurfaceCoordinateMigration = false; selectedId = null; parts.forEach(part => part.dirty = true); updateUI(); saveLayout(false);
  }

  function installMobileShell() {
    const scrim = document.createElement('button');
    scrim.className = 'mobile-scrim';
    scrim.type = 'button';
    scrim.setAttribute('aria-label', 'Close tools');
    document.querySelector('.layout').appendChild(scrim);
    scrim.onclick = () => setMobilePanel('body');
    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.setAttribute('aria-label', 'Mobile workspace');
    nav.innerHTML = `
      <button type="button" data-mobile-target="library">${svgIcon('<path d="M4 5.5h16M4 12h16M4 18.5h10"/><circle cx="18" cy="18.5" r="2.5"/>')}Design</button>
      <button type="button" data-mobile-target="body" class="on">${svgIcon('<circle cx="12" cy="5" r="2.3"/><path d="M8.5 21l.8-7-2.3-4.2 2.3-2.1h5.4l2.3 2.1-2.3 4.2.8 7M9.4 8.2L6 13m8.6-4.8L18 13"/>')}Body</button>
      <button type="button" data-mobile-target="edit">${svgIcon('<path d="M4 6h10M18 6h2M4 12h2m4 0h10M4 18h8m4 0h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>')}Edit</button>`;
    app.appendChild(nav);
    for (const button of nav.querySelectorAll('button')) button.onclick = () => setMobilePanel(button.dataset.mobileTarget);
    const updateViewport = () => document.documentElement.style.setProperty('--app-vh', `${(window.visualViewport?.height || window.innerHeight) / 100}px`);
    updateViewport();
    addEventListener('resize', updateViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', updateViewport, { passive: true });
    setMobilePanel('body');
  }

  function setMobilePanel(panel) {
    app.dataset.mobilePanel = panel;
    for (const button of document.querySelectorAll('[data-mobile-target]')) button.classList.toggle('on', button.dataset.mobileTarget === panel);
    if (panel === 'body') requestDraw();
  }

  installGenerator();
  installModelUI();
  installViewingTools();
  installMobileShell();
  installProgressSaving();
  const protectedAsset = ASSETS.find(asset => asset.id === 'wrist_reserved');
  if (protectedAsset) {
    protectedAsset.name = 'Existing tattoo / protected area';
    protectedAsset.protected = true;
    protectedAsset.locked = false;
  }
  for (const tattoo of tattoos) {
    if (tattoo.asset === 'wrist_reserved' || tattoo.locked) tattoo.protected = true;
    tattoo.locked = false;
  }
  renderLibrary();
  updateUI();
  async function equipAppearanceAsset(id) {
    const item=appearanceById.get(id);if(!item)throw new Error('Unknown MakeHuman asset');
    await loadAppearanceAsset(id);
    const multi=new Set(['Body accessories','Underlayers']);
    bodySettings.equippedAssets=(bodySettings.equippedAssets||[]).filter(current=>current!==id&&(multi.has(item.category)||appearanceById.get(current)?.category!==item.category));
    bodySettings.equippedAssets.push(id);parts.forEach(part=>part.dirty=true);requestDraw();return item;
  }
  function removeAppearanceAsset(id){bodySettings.equippedAssets=(bodySettings.equippedAssets||[]).filter(current=>current!==id);parts.forEach(part=>part.dirty=true);requestDraw();}
  function appearanceAssetStats(id){const mesh=meshAppearanceCache.get(id);if(!mesh)return null;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<mesh.positions.length;i+=3)for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],mesh.positions[i+axis]);max[axis]=Math.max(max[axis],mesh.positions[i+axis]);}return {vertices:mesh.positions.length/3,min,max,finite:[...min,...max].every(Number.isFinite)};}
  window.InkAtlasV7Bridge = {
    bodySettings, appearanceCatalog, measureTattooDistortion, decalMeshes, focusBodyRegion,
    equipAppearanceAsset, removeAppearanceAsset, appearanceAssetStats, isAppearanceAssetEquipped:id=>(bodySettings.equippedAssets||[]).includes(id),
    resetAnalysisBaselines: () => { for (const mesh of decalMeshes.values()) mesh.neutralPositions = null; },
    markAllDirty: () => { parts.forEach(part => part.dirty = true); requestDraw(); },
    updateClothing: () => { parts.forEach(part => part.dirty = true); requestDraw(); },
    updateRenderQuality: quality => {
      bodySettings.renderQuality = quality;
      const automatic = matchMedia('(max-width: 780px)').matches || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 1.15 : 1.75;
      window.INK_ATLAS_DPR_CAP = quality === 'high' ? 2 : quality === 'battery' ? 1 : automatic;
      requestDraw();
    }
  };
  bodySettings.equippedAssets.forEach(id => loadAppearanceAsset(id).catch(error => console.warn(error)));
  loadBundledModel();
})();
