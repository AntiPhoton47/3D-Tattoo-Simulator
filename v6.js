(() => {
  'use strict';

  const appearanceBuildVersion=new URL(document.currentScript?.src||location.href,location.href).searchParams.get('v')||'dev';
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
    ? { heightCm: 165, chestCm: 91, waistCm: 74, hipsCm: 99, bicepsCm: 28, thighsCm: 58, shoulderCm: 39, breastSize: 50, pecSize: 50, buttSize: 50, muscleDefinition: 35 }
    : { heightCm: 178, chestCm: 96, waistCm: 82, hipsCm: 96, bicepsCm: 32, thighsCm: 56, shoulderCm: 44, breastSize: 50, pecSize: 50, buttSize: 50, muscleDefinition: 35 };
  const appearanceCatalog = Array.isArray(window.INK_ATLAS_APPEARANCE_CATALOG) ? window.INK_ATLAS_APPEARANCE_CATALOG : [];
  const appearanceById = new Map(appearanceCatalog.map(item => [item.id, item]));
  const defaultEyeId=appearanceById.has('makehuman_system_assets_cc0_high_poly')?'makehuman_system_assets_cc0_high_poly':'none';
  window.INK_ATLAS_ASSET_PAYLOADS = window.INK_ATLAS_ASSET_PAYLOADS || {};
  const bodySettings = { profile: 'balanced', frame: 'balanced', skinTone: '#dfc8b3', skinTonePosition: 72, lipColor:'#ba9485', lipTonePosition:50, hairColor:'#35261f', hairTonePosition:18, facialHairColor:'#3b2a22', facialHairTonePosition:24, eyebrowColor:'#3b2a22', eyebrowTonePosition:24, eyelashColor:'#171412', eyelashTonePosition:0, modelType: selectedBodyModel, eyeStyle:defaultEyeId, eyebrowStyle:'none', eyelashStyle:'none', fingerNailStyle:'none', toeNailStyle:'none', noseShape:'none', earShape:'none', cheekShape:'none', eyeColor:'#514c48', renderQuality: 'auto', equippedAssets: defaultEyeId==='none'?[]:[defaultEyeId], ...bodyDefaults };
  const syncNativeEyeVisibility=()=>{window.INK_ATLAS_EXTERNAL_EYES_ACTIVE=(bodySettings.equippedAssets||[]).some(id=>appearanceById.get(id)?.category==='Eyes');};
  syncNativeEyeVisibility();
  try {
    const storedLayout = JSON.parse(localStorage.getItem('inkAtlas_tattoo_v1') || '{}'), prior = storedLayout.bodySettings;
    if (prior && ['balanced', 'athletic', 'broad', 'lean'].includes(prior.profile)) bodySettings.profile = prior.profile;
    if (prior && Number.isFinite(prior.heightCm)) bodySettings.heightCm = Math.max(130, Math.min(220, prior.heightCm));
    if (prior) for (const key of ['frame', 'skinTone', 'skinTonePosition', 'lipColor', 'lipTonePosition', 'hairColor', 'hairTonePosition', 'facialHairColor', 'facialHairTonePosition', 'eyebrowColor', 'eyebrowTonePosition', 'eyelashColor', 'eyelashTonePosition', 'chestCm', 'waistCm', 'hipsCm', 'bicepsCm', 'thighsCm', 'shoulderCm', 'breastSize', 'pecSize', 'buttSize', 'muscleDefinition', 'eyeStyle', 'eyebrowStyle', 'eyelashStyle', 'fingerNailStyle', 'toeNailStyle', 'noseShape', 'earShape', 'cheekShape', 'eyeColor', 'renderQuality']) if (prior[key] !== undefined) bodySettings[key] = prior[key];
    if (Array.isArray(prior?.equippedAssets)) bodySettings.equippedAssets = prior.equippedAssets.filter(id => appearanceById.has(id)).slice(0, 20);
  } catch (_) {}
  bodySettings.modelType = selectedBodyModel;
  const restoredBreastSize = Number(bodySettings.breastSize);
  bodySettings.breastSize = Number.isFinite(restoredBreastSize) ? Math.max(0, Math.min(400, restoredBreastSize)) : 50;
  bodySettings.pecSize = clamp(Number(bodySettings.pecSize)||50,0,250);
  bodySettings.buttSize = clamp(Number(bodySettings.buttSize)||50,0,200);
  bodySettings.muscleDefinition = clamp(Number(bodySettings.muscleDefinition)||0,0,100);
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
    const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uViewProjection;uniform float uOffset;uniform float uDepthBias;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){vNormal=aNormal;vUV=aUV;vPosition=aPosition;gl_Position=uViewProjection*vec4(aPosition+aNormal*uOffset,1.);gl_Position.z-=uDepthBias*gl_Position.w;}`;
    const fragment = `precision mediump float;uniform vec4 uColour;uniform vec3 uAccent;uniform vec4 uBounds;uniform vec3 uWorldMin;uniform vec3 uWorldMax;uniform float uPattern;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){if(vUV.x<uBounds.x||vUV.x>uBounds.y||vUV.y<uBounds.z||vUV.y>uBounds.w||any(lessThan(vPosition,uWorldMin))||any(greaterThan(vPosition,uWorldMax)))discard;if(uPattern>.5&&uPattern<1.5){vec2 grid=abs(fract(vec2(vUV.x*28.+vUV.y*34.,vUV.x*28.-vUV.y*34.))-.5);if(min(grid.x,grid.y)>.105)discard;}vec3 n=normalize(vNormal);float light=.54+.38*max(0.,dot(n,normalize(vec3(-.55,.82,1.1))))+.10*max(0.,dot(n,normalize(vec3(.72,.22,.40))));float weave=.025*sin(vUV.x*620.)*sin(vUV.y*710.);float edge=min(min(vUV.x-uBounds.x,uBounds.y-vUV.x),min(vUV.y-uBounds.z,uBounds.w-vUV.y));vec3 colour=mix(uAccent,uColour.rgb,smoothstep(0.,.014,edge));gl_FragColor=vec4(colour*(light+weave)+.018,uColour.a);}`;
    const instance = gl.createProgram(); gl.attachShader(instance, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(instance, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(instance);
    appearanceProgram = { instance, pos:gl.getAttribLocation(instance,'aPosition'), norm:gl.getAttribLocation(instance,'aNormal'), uv:gl.getAttribLocation(instance,'aUV'), vp:gl.getUniformLocation(instance,'uViewProjection'), offset:gl.getUniformLocation(instance,'uOffset'), depthBias:gl.getUniformLocation(instance,'uDepthBias'), colour:gl.getUniformLocation(instance,'uColour'), accent:gl.getUniformLocation(instance,'uAccent'), bounds:gl.getUniformLocation(instance,'uBounds'), worldMin:gl.getUniformLocation(instance,'uWorldMin'), worldMax:gl.getUniformLocation(instance,'uWorldMax'), pattern:gl.getUniformLocation(instance,'uPattern') };
  }
  const colour4 = (hex, alpha=1) => { const value=String(hex||'#333333').replace('#',''),full=value.length===3?value.split('').map(c=>c+c).join(''):value;return [parseInt(full.slice(0,2),16)/255,parseInt(full.slice(2,4),16)/255,parseInt(full.slice(4,6),16)/255,alpha]; };
  function fittedLayerStyle(item,mesh){
    const name=`${item.id} ${item.name||''}`,fishnet=/fishnet|armsleeve02|lace|mesh|netting/i.test(name),sheer=!fishnet&&/stocking|pantyhose|transparent|sheer/i.test(name),texture=mesh.textureAverage?.slice(0,3),material=mesh.material.diffuseColor?.slice(0,3)||[.28,.30,.33];
    let rgb=texture?texture.map((value,index)=>value*(material[index]??1)):material.slice();
    // Several MakeHuman cut-out atlases store their holes as opaque black.
    // For the body-conformal replacement use the supplied material hue, not
    // the black atlas background, and generate the holes geometrically.
    if(fishnet&&Math.max(...rgb)<.28){const hue=material.map((value,index)=>Math.max(value,texture?.[index]||0)),peak=Math.max(...hue,.001);rgb=hue.map(value=>value/peak*.46);}
    const colour='#'+rgb.map(value=>Math.round(clamp(value,0,1)*255).toString(16).padStart(2,'0')).join('');
    return {colour,pattern:fishnet?1:sheer?2:0,alpha:sheer?.48:1};
  }
  function sampledLayerColour(mesh,coverage,fallback){
    const atlas=mesh.texturePixels;if(!atlas||!mesh.uvs?.length)return fallback;const channels=[[],[],[]],min=coverage.worldMin||[-Infinity,-Infinity,-Infinity],max=coverage.worldMax||[Infinity,Infinity,Infinity],stride=Math.max(1,Math.floor(mesh.positions.length/3/1400));
    for(let vertex=0;vertex<mesh.positions.length/3;vertex+=stride){const at=vertex*3,x=mesh.positions[at],y=mesh.positions[at+1],z=mesh.positions[at+2];if(x<min[0]||x>max[0]||y<min[1]||y>max[1]||z<min[2]||z>max[2])continue;const u=clamp(mesh.uvs[vertex*2],0,1),v=clamp(1-mesh.uvs[vertex*2+1],0,1),pixel=(Math.min(atlas.size-1,Math.round(v*(atlas.size-1)))*atlas.size+Math.min(atlas.size-1,Math.round(u*(atlas.size-1))))*4;if(atlas.data[pixel+3]<96)continue;for(let channel=0;channel<3;channel++)channels[channel].push(atlas.data[pixel+channel]);}
    if(channels[0].length<8)return fallback;const material=mesh.material?.diffuseColor||[1,1,1],rgb=channels.map((values,index)=>percentile(values,.5)*(material[index]??1)),hex=rgb.map(value=>Math.round(clamp(value,0,255)).toString(16).padStart(2,'0')).join('');return `#${hex}`;
  }
  function fittedLayerCoverage(mesh,partId,padding=.018,radialFull=true){
    const part=partById[partId];if(!part?.positions||!mesh?.positions?.length)return null;
    const partBounds=positionBounds(part.positions),side=partId.startsWith('left_')?-1:partId.startsWith('right_')?1:0,margin=.30,values=[];
    // The backing must occupy only the portion of the anatomical surface that
    // is actually enclosed by this fitted asset. A whole-part backing fixes a
    // pinhole by painting the complete hand, forearm, foot or calf and is the
    // source of the hard cuffs and sock-shaped boots seen in previous builds.
    for(let at=0;at<mesh.positions.length;at+=3){const x=mesh.positions[at],y=mesh.positions[at+1],z=mesh.positions[at+2];if(side&&Math.sign(mesh.restPositions[at]||x||side)!==side)continue;if(x<partBounds.min[0]-margin||x>partBounds.max[0]+margin||y<partBounds.min[1]-margin||y>partBounds.max[1]+margin||z<partBounds.min[2]-margin||z>partBounds.max[2]+margin)continue;values.push(x,y,z);}
    if(values.length<9)return null;const garmentBounds=positionBounds(values),partSize=boundsSize(partBounds),longitudinal=/torso|pelvis|thigh|calf/.test(partId)?1:partSize.indexOf(Math.max(...partSize)),worldMin=[],worldMax=[];
    // Clip at the authored cuff/hem along the limb, but cover the complete
    // radial cross-section inside it. This fills genuine mesh pinholes without
    // turning a boot or glove into a whole-part body shell.
    for(let axis=0;axis<3;axis++){const clipToGarment=axis===longitudinal||!radialFull;worldMin[axis]=clipToGarment?Math.max(partBounds.min[axis]-.006,garmentBounds.min[axis]-padding):partBounds.min[axis]-.006;worldMax[axis]=clipToGarment?Math.min(partBounds.max[axis]+.006,garmentBounds.max[axis]+padding):partBounds.max[axis]+.006;if(worldMax[axis]-worldMin[axis]<.004)return null;}
    return {bounds:[0,1,0,1],worldMin,worldMax};
  }
  function appearanceOccludedPartIds(item){
    const name=`${item?.id||''} ${item?.name||''}`;
    if(item?.category==='Bottoms')return ['pelvis','left_thigh','right_thigh','left_calf','right_calf'];
    if(item?.category==='Skirts')return ['pelvis','left_thigh','right_thigh'];
    if(['Tops','Dresses'].includes(item?.category)&&!/open|cut.?out|strap|sleeveless|halter|apron|bikini|crop/i.test(name))return ['torso','pelvis','left_upper_arm','right_upper_arm','left_forearm','right_forearm'];
    if(item?.category==='Shoes'&&!/sandal|flip|open|peep|barefoot/i.test(name))return ['left_foot','right_foot','left_calf','right_calf','left_thigh','right_thigh'];
    if(item?.category==='Gloves'&&!/mma|fingerless|open/i.test(name))return ['left_hand','right_hand','left_forearm','right_forearm','left_upper_arm','right_upper_arm'];
    if(item?.category==='Underlayers'&&/sock|stocking|pantyhose|leg.warmer/i.test(name))return ['left_foot','right_foot','left_calf','right_calf','left_thigh','right_thigh'];
    if(item?.category==='Underlayers'&&/armsleeve/i.test(name))return ['left_forearm','right_forearm','left_upper_arm','right_upper_arm'];
    if(item?.category==='Underlayers'&&/bra|bandeau|brief|pant(?:y|ies)|thong|slip|bootyshort|bikini.bottom/i.test(name))return ['torso','pelvis'];
    return [];
  }
  function appearancePasses() {
    const equipped=bodySettings.equippedAssets||[],passes=[],hairId=equipped.find(id=>appearanceById.get(id)?.category==='Hair'),hatId=equipped.find(id=>appearanceById.get(id)?.category==='Hats'),tightHat=hatId&&hatRequiresBareScalp(appearanceById.get(hatId));let coverId=tightHat?hatId:hairId;
    // A close-fitting, tall hat can expose the scalp through an authored crown
    // opening. Detect that class from its geometry rather than maintaining a
    // list of asset-specific offsets.
    if(!coverId&&hatId){const hat=meshAppearanceCache.get(hatId);if(hat){const bounds=positionBounds(hat.restPositions),size=boundsSize(bounds);if(size[1]>.70&&size[0]<.75)coverId=hatId;}}
    if(coverId){
      const coverItem=appearanceById.get(coverId),coverMesh=meshAppearanceCache.get(coverId),head=partById.head&&positionBounds(partById.head.positions),style=coverMesh?fittedLayerStyle(coverItem,coverMesh):null,average=coverMesh?.textureAverage,colour=style?.colour||(average?'#'+average.slice(0,3).map(value=>Math.round(clamp(value,0,1)*255).toString(16).padStart(2,'0')).join(''):(hairId?'#35261f':'#3b3b3b'));
      // The backing is restricted to the crown in world space. UV-space
      // cropping painted a hard rectangle across the forehead on some heads
      // and still missed holes in swim caps and knitted hats whose atlases use
      // a different UV orientation.
      const isHat=coverItem?.category==='Hats';
      // Hair and hat hole-fill belongs on the crown, never on the face. The
      // head's forward axis is +Z in the imported MakeHuman body; capping it
      // here removes the mask that a full-head material pass painted over the
      // eyes, nose and mouth while retaining coverage on the top and rear.
      passes.push({part:'head',colour,accent:colour,alpha:1,offset:.0015,bounds:[0,1,0,1],worldMin:[-99,head?head.max[1]-(isHat?.30:.18):-99,head?head.center[2]-(isHat?.10:0):-99],worldMax:[99,99,99]});
    }
    // Clothing is rendered as physical geometry.  Do not paint a second copy
    // of its material onto the body beneath it: loose hems, open necklines and
    // transparent fabrics otherwise leave garment-coloured patches on skin.
    // The sole underlay retained here is the crown fill above, which closes
    // authored hair-cap holes without touching the face or body.
    return passes;
  }
  function appearanceBodyClipBoxes(){
    // Never carve axis-aligned volumes out of the anatomical mesh.  A garment
    // may be open, asymmetric, fingerless, fishnet, or split into disconnected
    // components; its AABB cannot describe what it actually covers.  These
    // clip boxes caused the apparent missing shoulders, wrists, pelvis and
    // lower legs reported for otherwise unrelated assets.  Ordinary depth
    // testing now provides exact per-pixel occlusion and keeps tattoos visible
    // wherever cloth is not physically in front of them.
    return [];
  }
  function renderAppearanceLayers(){
    if(software)return;const passes=appearancePasses();if(!passes.length)return;ensureAppearanceProgram();const pgr=appearanceProgram;gl.useProgram(pgr.instance);gl.uniformMatrix4fv(pgr.vp,false,viewProjection);gl.enable(gl.DEPTH_TEST);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-.8,-.8);
    for(const pass of passes){const part=partById[pass.part];if(!part)continue;const headUnderlay=pass.part==='head',colour=colour4(pass.colour,pass.alpha),edge=colour4(pass.accent),backingIndices=headUnderlay?part.indices:(part.appearanceBaseIndices||part.indices);if(!headUnderlay&&!part.appearanceBackingIb){part.appearanceBackingIb=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.appearanceBackingIb);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,backingIndices,gl.STATIC_DRAW);}gl.uniform1f(pgr.offset,pass.offset);gl.uniform1f(pgr.depthBias,headUnderlay?0:.0011);gl.uniform4fv(pgr.colour,colour);gl.uniform3fv(pgr.accent,edge.slice(0,3));gl.uniform4fv(pgr.bounds,pass.bounds);gl.uniform3fv(pgr.worldMin,pass.worldMin||[-99,-99,-99]);gl.uniform3fv(pgr.worldMax,pass.worldMax||[99,99,99]);gl.uniform1f(pgr.pattern,pass.pattern||0);if(pass.alpha<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}gl.bindBuffer(gl.ARRAY_BUFFER,part.pb);gl.vertexAttribPointer(pgr.pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.pos);gl.bindBuffer(gl.ARRAY_BUFFER,part.nb);gl.vertexAttribPointer(pgr.norm,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.norm);gl.bindBuffer(gl.ARRAY_BUFFER,part.ub);gl.vertexAttribPointer(pgr.uv,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.uv);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,headUnderlay?part.ib:part.appearanceBackingIb);gl.drawElements(gl.TRIANGLES,headUnderlay?part.count:backingIndices.length,part.indexType||gl.UNSIGNED_SHORT,0);if(pass.alpha<1){gl.depthMask(true);gl.disable(gl.BLEND);}}
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  // MakeHuman wardrobe and grooming meshes remain local, retain their source
  // materials, and are loaded only when selected.
  let meshAppearanceProgram = null;
  const meshAppearanceCache = new Map();
  const appearanceLoadPromises = new Map();
  let appearanceFitRevision=1,appearanceRefits=0;
  const applyPoseBeforeAppearanceCache=applyPose;
  applyPose=function applyPoseWithAppearanceInvalidation(){appearanceFitRevision++;const result=applyPoseBeforeAppearanceCache();updateAppearanceBodyMask();return result;};
  const baseVertexMapCache = new Map();
  let canonicalBasePositionCache = null;
  function typedArrayFromBase64(encoded, Type) {
    const binary = atob(encoded), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Type(bytes.buffer);
  }
  function baseVertexMap(){const key=bodySettings.modelType;if(!baseVertexMapCache.has(key)){const encoded=window.INK_ATLAS_BASE_VERTEX_MAPS?.[key];baseVertexMapCache.set(key,encoded?typedArrayFromBase64(encoded,Uint32Array):null);}return baseVertexMapCache.get(key);}
  function canonicalBasePositions(){if(canonicalBasePositionCache)return canonicalBasePositionCache;const source=window.INK_ATLAS_BASE_VERTEX_MAPS;if(!source?.positions)return null;const encoded=typedArrayFromBase64(source.positions,Uint16Array),positions=new Float32Array(encoded.length);for(let index=0;index<encoded.length;index++)positions[index]=source.positionMin[index%3]+encoded[index]*source.positionScale[index%3];return canonicalBasePositionCache=positions;}
  window.INK_ATLAS_ACTIVE_BASE_VERTEX_MAP=baseVertexMap();
  window.INK_ATLAS_ANATOMY_DECODED=new Map((window.INK_ATLAS_ANATOMY_LIBRARY||[]).map(item=>{const decoded={...item,indices:typedArrayFromBase64(item.indices,Uint16Array),deltas:typedArrayFromBase64(item.deltas,Int16Array)};if(item.positionType==='q16'&&item.positions){const encoded=typedArrayFromBase64(item.positions,Uint16Array),positions=new Float32Array(encoded.length);for(let i=0;i<encoded.length;i++)positions[i]=item.positionMin[i%3]+encoded[i]*item.positionScale[i%3];decoded.positions=positions;}return [item.id,decoded];}));
  function loadAppearanceAsset(id) {
    if (window.INK_ATLAS_APPEARANCE_ASSETS?.[id] || window.INK_ATLAS_ASSET_PAYLOADS?.[id]) return Promise.resolve(id);
    if (appearanceLoadPromises.has(id)) return appearanceLoadPromises.get(id);
    const item = appearanceById.get(id); if (!item) return Promise.reject(new Error('Unknown appearance asset'));
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = `${item.file}?v=${encodeURIComponent(appearanceBuildVersion)}`; script.async = true;
      script.onload = () => { if((bodySettings.equippedAssets||[]).includes(id))updateAppearanceBodyMask();requestDraw();resolve(id); };
      script.onerror = () => { appearanceLoadPromises.delete(id); reject(new Error(`Could not load ${item.name}`)); };
      document.head.append(script);
    });
    appearanceLoadPromises.set(id, promise); return promise;
  }
  function ensureMeshAppearanceProgram() {
    if (meshAppearanceProgram || software) return;
    const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uViewProjection;uniform float uDepthBias;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){vNormal=aNormal;vPosition=aPosition;vUV=aUV;gl_Position=uViewProjection*vec4(aPosition,1.);gl_Position.z-=uDepthBias*gl_Position.w;}`;
    const fragment = `precision mediump float;uniform vec4 uColour;uniform vec3 uAccent;uniform vec3 uAtlasFallback;uniform float uFabric;uniform float uUseTexture;uniform float uForceOpaque;uniform float uShininess;uniform float uEye;uniform sampler2D uTexture;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){vec3 n=normalize(vNormal);float key=max(0.,dot(n,normalize(vec3(-.55,.82,1.1))));float fill=max(0.,dot(n,normalize(vec3(.72,.22,.40))));float light=.50+.39*key+.11*fill;float grain=uFabric*.018*sin(vPosition.x*155.)*sin(vPosition.y*190.);vec4 sample=texture2D(uTexture,vUV);float texelVisible=step(.035,sample.a);vec3 sampleColour=mix(uAtlasFallback,sample.rgb,texelVisible);float luma=dot(sampleColour,vec3(.299,.587,.114));float sourceChroma=max(sampleColour.r,max(sampleColour.g,sampleColour.b))-min(sampleColour.r,min(sampleColour.g,sampleColour.b));float iris=smoothstep(.035,.12,sourceChroma)*(1.-smoothstep(.86,.98,luma))*uEye;vec3 selectedIris=mix(uAccent*.40,uAccent*1.16,clamp(luma*1.45,0.,1.));vec3 textured=mix(sampleColour,selectedIris,iris*.96);vec3 plain=mix(uAccent,uColour.rgb,.90+.06*key),colour=mix(plain,textured*uColour.rgb,uUseTexture);float spec=pow(max(0.,dot(reflect(-normalize(vec3(-.55,.82,1.1)),n),normalize(vec3(0.,0.,1.)))),mix(8.,72.,uShininess))*.18*uShininess;float sampledAlpha=mix(sample.a,step(.012,sample.a),step(.2,uFabric)),alpha=uColour.a*mix(1.,sampledAlpha,uUseTexture);alpha=mix(alpha,uColour.a,uForceOpaque);if(alpha<.035)discard;gl_FragColor=vec4(colour*(light+grain)+spec+.018,alpha);}`;
    const instance = gl.createProgram(); gl.attachShader(instance, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(instance, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(instance);
    meshAppearanceProgram = { instance, pos:gl.getAttribLocation(instance,'aPosition'), norm:gl.getAttribLocation(instance,'aNormal'), uv:gl.getAttribLocation(instance,'aUV'), vp:gl.getUniformLocation(instance,'uViewProjection'), depthBias:gl.getUniformLocation(instance,'uDepthBias'), colour:gl.getUniformLocation(instance,'uColour'), accent:gl.getUniformLocation(instance,'uAccent'), atlasFallback:gl.getUniformLocation(instance,'uAtlasFallback'), fabric:gl.getUniformLocation(instance,'uFabric'), useTexture:gl.getUniformLocation(instance,'uUseTexture'), forceOpaque:gl.getUniformLocation(instance,'uForceOpaque'), shininess:gl.getUniformLocation(instance,'uShininess'), eye:gl.getUniformLocation(instance,'uEye'), texture:gl.getUniformLocation(instance,'uTexture') };
  }
  function ensureMeshAppearanceAsset(id) {
    if (meshAppearanceCache.has(id)) return meshAppearanceCache.get(id);
    const raw = window.INK_ATLAS_APPEARANCE_ASSETS?.[id] || window.INK_ATLAS_ASSET_PAYLOADS?.[id]; if (!raw || software) return null;
    const catalog=appearanceById.get(id);let restPositions;
    if (raw.positionType === 'q16') {
      const quantized = typedArrayFromBase64(raw.positions, Uint16Array); restPositions = new Float32Array(quantized.length);
      for (let i = 0; i < quantized.length; i++) restPositions[i] = raw.positionMin[i % 3] + quantized[i] * raw.positionScale[i % 3];
    } else restPositions = typedArrayFromBase64(raw.positions, Float32Array);
    const sourceIndices = typedArrayFromBase64(raw.indices, raw.indexType === 'u32' ? Uint32Array : Uint16Array);let indices=sourceIndices;
    // A few community glove and footwear exports contain triangles that join
    // the wearable mesh to a distant helper vertex. Those triangles become
    // screen-spanning spikes even though the actual authored object is sound.
    if(['Shoes','Gloves'].includes(catalog?.category)){
      const gloves=catalog.category==='Gloves',malformedMma=gloves&&/mma/i.test(`${catalog.id} ${catalog.name}`),kept=[];
      // The MMA export contains four otherwise valid glove shells with a few
      // vertices stretched more than three body units upward. Removing the
      // entire connected shell also removed the palm and knuckle coverage.
      // Clip only triangles that cross the corrupted source range; the intact
      // lower shell and all finger components then retain their authored form.
      for(let at=0;at<sourceIndices.length;at+=3){const ids=[sourceIndices[at],sourceIndices[at+1],sourceIndices[at+2]];let longest=0,outside=false;for(const id of ids){const y=restPositions[id*3+1];if(malformedMma&&(y<.15||y>1.35))outside=true;}for(const [first,second] of [[0,1],[1,2],[2,0]]){const a=ids[first]*3,b=ids[second]*3;longest=Math.max(longest,Math.hypot(restPositions[a]-restPositions[b],restPositions[a+1]-restPositions[b+1],restPositions[a+2]-restPositions[b+2]));}if(!outside&&longest<=.75)kept.push(...ids);}if(kept.length!==sourceIndices.length)indices=new sourceIndices.constructor(kept);
    }
    let uvs=new Float32Array(restPositions.length/3*2);if(raw.uvs){const encodedUV=typedArrayFromBase64(raw.uvs,Uint16Array);for(let i=0;i<encodedUV.length;i++)uvs[i]=encodedUV[i]/65535;}
    let bindOffsets=null;if(raw.bindOffsets){const encoded=typedArrayFromBase64(raw.bindOffsets,raw.bindOffsetType==='q8'?Uint8Array:Uint16Array);bindOffsets=new Float32Array(encoded.length);for(let i=0;i<encoded.length;i++)bindOffsets[i]=raw.bindOffsetMin[i%3]+encoded[i]*raw.bindOffsetScale[i%3];}
    let bindWeights=null,bindWeightDivisor=255;if(raw.bindWeights&&raw.bindWeightType==='q16x2'){const encoded=typedArrayFromBase64(raw.bindWeights,Uint16Array),count=restPositions.length/3;bindWeights=new Float32Array(count*3);for(let vertex=0;vertex<count;vertex++){const a=raw.bindWeightMin[0]+encoded[vertex*2]*raw.bindWeightScale[0],b=raw.bindWeightMin[1]+encoded[vertex*2+1]*raw.bindWeightScale[1];bindWeights[vertex*3]=a;bindWeights[vertex*3+1]=b;bindWeights[vertex*3+2]=1-a-b;}bindWeightDivisor=1;}else if(raw.bindWeights){bindWeights=typedArrayFromBase64(raw.bindWeights,raw.bindWeightType==='u16'?Uint16Array:Uint8Array);bindWeightDivisor=raw.bindWeightType==='u16'?65535:255;}
    const mesh = { id, catalog, material:raw.material||{}, textureURL:raw.texture||'', textureReady:false, restPositions, positions:restPositions.slice(), normals:new Float32Array(restPositions.length), uvs, indices, watchParts:raw.watchParts?typedArrayFromBase64(raw.watchParts,Uint8Array):null, deleteVerts:raw.deleteVerts?typedArrayFromBase64(raw.deleteVerts,Uint16Array):null, bindIndices:raw.bindIndices?typedArrayFromBase64(raw.bindIndices,Uint16Array):null, bindWeights, bindWeightDivisor, bindOffsets, bindScaleRefs:raw.bindScaleRefs||null, bindCanonicalScale:Number(raw.canonicalScale)||6.88/(8.4967- -8.4488), bindRig:null, bindLocalOffsets:null, bindFrameScales:null, bindNeutralAnchors:null, bindRestPositions:null, bindSourceError:null, fitStats:null, count:indices.length, indexType:indices instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT, pb:gl.createBuffer(), nb:gl.createBuffer(), ub:gl.createBuffer(), ib:gl.createBuffer(), texture:gl.createTexture() };
    recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.ub);gl.bufferData(gl.ARRAY_BUFFER,mesh.uvs,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
    if(mesh.textureURL){const image=new Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);try{const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,size,size);const rgba=context.getImageData(0,0,size,size).data,alpha=new Uint8Array(size*size);let opaque=0,weight=0,red=0,green=0,blue=0;for(let pixel=0;pixel<alpha.length;pixel++){const a=rgba[pixel*4+3];alpha[pixel]=a;if(a>=250)opaque++;if(a>=96){const w=a/255;weight+=w;red+=rgba[pixel*4]*w;green+=rgba[pixel*4+1]*w;blue+=rgba[pixel*4+2]*w;}}let sampled=0,sampledOpaque=0,sampledLow=0,sampledAlpha=0;const triangleStride=Math.max(1,Math.floor(mesh.indices.length/3/6000)),sampleWeights=[[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]];for(let tri=0;tri<mesh.indices.length/3;tri+=triangleStride){const ids=[mesh.indices[tri*3],mesh.indices[tri*3+1],mesh.indices[tri*3+2]];for(const weights of sampleWeights){let u=0,v=0;for(let corner=0;corner<3;corner++){u+=mesh.uvs[ids[corner]*2]*weights[corner];v+=mesh.uvs[ids[corner]*2+1]*weights[corner];}const x=Math.min(size-1,Math.max(0,Math.round(u*(size-1)))),y=Math.min(size-1,Math.max(0,Math.round((1-v)*(size-1)))),a=alpha[y*size+x];sampled++;sampledAlpha+=a;if(a>=250)sampledOpaque++;if(a<96)sampledLow++;}}mesh.alphaMap={data:alpha,size,opaqueFraction:opaque/alpha.length,sampledOpaqueFraction:sampled?sampledOpaque/sampled:1,sampledLowFraction:sampled?sampledLow/sampled:0,sampledMean:sampled?sampledAlpha/(255*sampled):1};mesh.texturePixels={data:new Uint8ClampedArray(rgba),size};if(weight)mesh.textureAverage=[red/(255*weight),green/(255*weight),blue/(255*weight),1];}catch(_){}mesh.textureReady=true;delete mesh.backing;if((bodySettings.equippedAssets||[]).includes(id))updateAppearanceBodyMask();requestDraw();};image.src=mesh.textureURL;}
    meshAppearanceCache.set(id,mesh);return mesh;
  }
  function attachmentFrame(points) {
    const first=sub(points[1],points[0]),second=sub(points[2],points[0]),length1=Math.hypot(...first),normalRaw=cross(first,second),normalLength=Math.hypot(...normalRaw);
    if(length1<1e-7||normalLength<1e-9)return {x:[1,0,0],y:[0,1,0],n:[0,0,1],sx:1,sy:1};
    const x=scale(first,1/length1),n=scale(normalRaw,1/normalLength),y=normal(cross(n,x)),length2=Math.max(1e-7,Math.abs(dot(second,y)));
    return {x,y,n,sx:length1,sy:length2};
  }
  function outwardAttachmentFrame(points,anchor){
    let frame=attachmentFrame(points),outward;
    // Around the head, a horizontal body-axis heuristic cannot distinguish an
    // outward chin normal from an inward one.  Orient the frame from the posed
    // head centre so scalp, cheeks and the underside of the jaw all receive a
    // coherent three-dimensional outward direction.
    if(anchor[1]>2.05&&partById.head?.positions)outward=sub(anchor,positionBounds(partById.head.positions).center);
    else outward=[anchor[0],0,anchor[2]];
    let length=Math.hypot(...outward);
    if(length<.08){outward=[0,anchor[1]>=2.35?1:-1,0];length=1;}
    if(dot(frame.n,outward)<0)frame={...frame,y:scale(frame.y,-1),n:scale(frame.n,-1)};
    return frame;
  }
  function boundAttachmentFrame(mesh,at,points,anchor){
    if(mesh.catalog?.category!=='Bottoms'||!mesh.bindFrameSigns)return outwardAttachmentFrame(points,anchor);
    let frame=attachmentFrame(points);if(mesh.bindFrameSigns[at/3]<0)frame={...frame,y:scale(frame.y,-1),n:scale(frame.n,-1)};return frame;
  }
  function meshBindingWeights(mesh,at){const divisor=mesh.bindWeightDivisor||255,weights=[mesh.bindWeights[at]/divisor,mesh.bindWeights[at+1]/divisor,mesh.bindWeights[at+2]/divisor],total=weights[0]+weights[1]+weights[2]||1;return weights.map(value=>value/total);}
  function meshProxyScales(mesh,baseMap,pointAt){
    return [0,1,2].map(axis=>{const ref=mesh.bindScaleRefs?.[axis];if(!ref||ref.length<3||ref[2]===0)return mesh.bindCanonicalScale;const first=baseMap[ref[0]],second=baseMap[ref[1]];if(first===undefined||second===undefined)return mesh.bindCanonicalScale;const a=pointAt(first),b=pointAt(second),value=Math.abs(a[axis]-b[axis])/Math.abs(ref[2]);return Number.isFinite(value)&&value>1e-8?value:mesh.bindCanonicalScale;});
  }
  function appearanceClearance(category){return {Eyes:.0008,Eyebrows:.0015,Eyelashes:.0015,'Finger nails':.005,'Toe nails':.005,'Facial hair':.0008,Hair:.0025,Hats:.0025,Eyewear:.0025,Underlayers:.008,Tops:.012,Dresses:.015,Bottoms:.016,Skirts:.017,Shoes:.011,Gloves:.010,'Wrist accessories':.006,Rings:.003,Necklaces:.009}[category]??.006;}
  function proxyGuidePoint(mesh,vertex,canonical){const at=vertex*3;if(!canonical||!mesh.bindIndices||!mesh.bindWeights)return [mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]];const weights=meshBindingWeights(mesh,at),point=[0,0,0];for(let corner=0;corner<3;corner++){const source=mesh.bindIndices[at+corner]*3;if(source+2>=canonical.length)continue;for(let axis=0;axis<3;axis++)point[axis]+=canonical[source+axis]*weights[corner];}return point;}
  function prepareSurfaceBindings(mesh) {
    if (!importedRig?.surfaceAttachment || !importedRig.neutralPoint) return false;
    if (mesh.bindRig === importedRig && mesh.bindSurfaceIndices) return true;
    const count=mesh.restPositions.length/3,indices=new Uint32Array(count*3),weights=new Float32Array(count*3),offsets=new Float32Array(count*3),signs=new Int8Array(count),distances=new Float32Array(count),neutralAnchors=new Float32Array(count*3),guidePositions=new Float32Array(count*3),fittedRest=new Float32Array(count*3),sourceErrors=[],clearance=appearanceClearance(mesh.catalog?.category),canonical=canonicalBasePositions();
    for(let vertex=0;vertex<count;vertex++){
      const at=vertex*3,rest=[mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]];
      // Several community trouser proxies were authored against an hm08 base
      // whose numeric vertex order differs from the converted body used here.
      // Their OBJ geometry is nevertheless in the correct MakeHuman neutral
      // space. Register bottoms from that geometry itself; replaying the stale
      // proxy indices attaches crotch and shin panels to unrelated triangles.
      const guide=mesh.catalog?.category==='Bottoms'?rest:proxyGuidePoint(mesh,vertex,canonical),attachment=importedRig.surfaceAttachment(guide);if(!attachment)return false;indices.set(attachment.ids,at);weights.set(attachment.weights,at);guidePositions.set(guide,at);const points=attachment.ids.map(index=>importedRig.neutralPoint(index)),anchor=[0,0,0];for(let corner=0;corner<3;corner++)for(let axis=0;axis<3;axis++)anchor[axis]+=points[corner][axis]*attachment.weights[corner];let frame=outwardAttachmentFrame(points,anchor),sign=1;if(mesh.catalog?.category==='Bottoms'){const raw=attachmentFrame(points),toGarment=sub(rest,anchor);sign=dot(raw.n,toGarment)<0?-1:1;frame=sign<0?{...raw,y:scale(raw.y,-1),n:scale(raw.n,-1)}:raw;}const offset=sub(rest,guide),local=[dot(offset,frame.x),dot(offset,frame.y),Math.max(clearance,dot(offset,frame.n))],expected=[anchor[0]+frame.x[0]*local[0]+frame.y[0]*local[1]+frame.n[0]*local[2],anchor[1]+frame.x[1]*local[0]+frame.y[1]*local[1]+frame.n[1]*local[2],anchor[2]+frame.x[2]*local[0]+frame.y[2]*local[1]+frame.n[2]*local[2]];offsets.set(local,at);signs[vertex]=sign;distances[vertex]=Math.hypot(...offset);neutralAnchors.set(anchor,at);fittedRest.set(expected,at);sourceErrors.push(Math.hypot(expected[0]-rest[0],expected[1]-rest[1],expected[2]-rest[2]));
    }
    sourceErrors.sort((a,b)=>a-b);mesh.bindRig=importedRig;mesh.bindSurfaceIndices=indices;mesh.bindSurfaceWeights=weights;mesh.bindFrameSigns=signs;mesh.bindSurfaceDistances=distances;mesh.bindLocalOffsets=offsets;mesh.bindNeutralAnchors=neutralAnchors;mesh.bindGuidePositions=guidePositions;mesh.bindRestPositions=fittedRest;mesh.bindSourceError={median:sourceErrors[Math.floor(sourceErrors.length*.5)]||0,p95:sourceErrors[Math.floor(sourceErrors.length*.95)]||0,max:sourceErrors.at(-1)||0};return true;
  }
  function blendPoint(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
  // Only objects whose authored shape must remain rigid use landmark frames.
  // Surface-bound details and grooming assets use their MakeHuman proxy data,
  // so the same face and body deformation reaches the asset vertex-for-vertex.
  const rigidHeadCategories=new Set(['Eyes','Eyebrows','Eyelashes','Eyewear','Hats']),pairedHeadCategories=new Set(['Eyes','Eyebrows','Eyelashes','Eyewear']);
  function median(values){if(!values.length)return 0;values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];}
  function percentile(values,fraction){if(!values.length)return 0;values.sort((a,b)=>a-b);return values[Math.max(0,Math.min(values.length-1,Math.floor((values.length-1)*fraction)))];}
  function positionBounds(values){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let at=0;at<values.length;at+=3)for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],values[at+axis]);max[axis]=Math.max(max[axis],values[at+axis]);}return {min,max,center:min.map((value,axis)=>(value+max[axis])*.5)};}
  function sideBounds(values,side){const selected=[],sign=side==='left'?-1:1;for(let at=0;at<values.length;at+=3)if(values[at]*sign>0)selected.push(values[at],values[at+1],values[at+2]);return selected.length?positionBounds(selected):null;}
  function boundsSize(bounds){return bounds.min.map((value,axis)=>Math.max(1e-5,bounds.max[axis]-value));}
  function alignEyesToSockets(mesh){
    const sockets=partById.eyes?.positions;if(!sockets)return 0;let largest=0;
    for(const side of ['left','right']){
      const source=sideBounds(mesh.positions,side),target=sideBounds(sockets,side);if(!source||!target)continue;const sourceSize=boundsSize(source),targetSize=boundsSize(target),scaleByAxis=targetSize.map((value,axis)=>clamp(value/sourceSize[axis],.55,2.2));
      for(let at=0;at<mesh.positions.length;at+=3){if((mesh.positions[at]<0?'left':'right')!==side)continue;for(let axis=0;axis<3;axis++){const value=target.center[axis]+(mesh.positions[at+axis]-source.center[axis])*scaleByAxis[axis];largest=Math.max(largest,Math.abs(value-mesh.positions[at+axis]));mesh.positions[at+axis]=value;}}
    }
    return largest;
  }
  function alignPeriocularAsset(mesh){
    const sockets=partById.eyes?.positions;if(!sockets)return 0;let largest=0;const eyebrow=mesh.catalog?.category==='Eyebrows',eyelash=mesh.catalog?.category==='Eyelashes';
    for(const side of ['left','right']){
      const source=sideBounds(mesh.positions,side),eye=sideBounds(sockets,side);if(!source||!eye)continue;const sourceSize=boundsSize(source),eyeSize=boundsSize(eye),uniform=clamp(eyeSize[0]*(eyebrow?1.14:1.04)/sourceSize[0],.68,1.45),targetY=eyebrow?eye.max[1]+eyeSize[1]*.43:eye.center[1]+eyeSize[1]*.05,scaledFront=source.center[2]+(source.max[2]-source.center[2])*uniform,targetFront=eye.max[2]+(eyelash ? .002 : 0),translation=[eye.center[0]-source.center[0],targetY-source.center[1],eyelash?targetFront-scaledFront:0];
      for(let at=0;at<mesh.positions.length;at+=3){if((mesh.positions[at]<0?'left':'right')!==side)continue;for(let axis=0;axis<3;axis++){const scaled=source.center[axis]+(mesh.positions[at+axis]-source.center[axis])*uniform,value=scaled+translation[axis];largest=Math.max(largest,Math.abs(value-mesh.positions[at+axis]));mesh.positions[at+axis]=value;}}
    }
    return largest;
  }
  function alignEyewearToFace(mesh){
    const eyes=partById.eyes?.positions,ears=bodyPrimitiveBounds('earSkin'),head=partById.head?.positions;if(!eyes||!head)return 0;const eyeBounds=positionBounds(eyes),eyeSize=boundsSize(eyeBounds),source=positionBounds(mesh.positions),sourceSize=boundsSize(source),earWidth=ears?ears.max[0]-ears.min[0]:positionBounds(head).max[0]*2,frontSource=[];
    for(let at=0;at<mesh.positions.length;at+=3)if(mesh.positions[at+2]>source.center[2]&&mesh.positions[at+1]>source.min[1]+sourceSize[1]*.18)frontSource.push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);
    const lensSource=frontSource.length?positionBounds(frontSource):source,lensWidth=Math.max(.001,lensSource.max[0]-lensSource.min[0]),templeScale=earWidth*.92/sourceSize[0],lensScale=eyeSize[0]*1.18/lensWidth,faceWidthScale=.56/sourceSize[0],uniform=clamp(Math.min(templeScale,lensScale*1.06,faceWidthScale),.08,1.20),faceFront=[];
    for(let at=0;at<head.length;at+=3)if(head[at+1]>eyeBounds.min[1]-.05&&head[at+1]<eyeBounds.max[1]+.09&&Math.abs(head[at]-eyeBounds.center[0])<eyeSize[0]*.68)faceFront.push(head[at+2]);
    const targetFront=(faceFront.length?percentile(faceFront,.94):eyeBounds.max[2])+.014,scaledFront=source.center[2]+(lensSource.max[2]-source.center[2])*uniform,translation=[eyeBounds.center[0]-source.center[0],eyeBounds.center[1]+.008-source.center[1],targetFront-scaledFront];let largest=0;
    for(let at=0;at<mesh.positions.length;at+=3)for(let axis=0;axis<3;axis++){const value=source.center[axis]+(mesh.positions[at+axis]-source.center[axis])*uniform+translation[axis];largest=Math.max(largest,Math.abs(value-mesh.positions[at+axis]));mesh.positions[at+axis]=value;}
    if(mesh.bindSurfaceIndices){const corrections=[];for(let vertex=0;vertex<mesh.positions.length/3;vertex++){const at=vertex*3,anchor=currentSurfaceAnchor(mesh,at),points=[0,1,2].map(corner=>importedRig.worldPoint(mesh.bindSurfaceIndices[at+corner])),frame=outwardAttachmentFrame(points,anchor);if(Math.abs(anchor[0]-eyeBounds.center[0])>eyeSize[0]*.75||anchor[1]<eyeBounds.min[1]-.08||anchor[1]>eyeBounds.max[1]+.12||frame.n[2]<.35)continue;const distance=dot(sub([mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]],anchor),frame.n);corrections.push((.008-distance)/frame.n[2]);}const forward=clamp(percentile(corrections,.90),0,.065);if(forward){for(let at=2;at<mesh.positions.length;at+=3)mesh.positions[at]+=forward;largest=Math.max(largest,forward);}}
    return largest;
  }
  function currentSurfaceAnchor(mesh,at){const anchor=[0,0,0];for(let corner=0;corner<3;corner++){const point=importedRig.worldPoint(mesh.bindSurfaceIndices[at+corner]),weight=mesh.bindSurfaceWeights[at+corner];for(let axis=0;axis<3;axis++)anchor[axis]+=point[axis]*weight;}return anchor;}
  function currentProxyAnchor(mesh,at){
    const map=baseVertexMap();if(!map||!mesh.bindIndices||!mesh.bindWeights)return null;const anchor=[0,0,0],weights=meshBindingWeights(mesh,at);
    for(let corner=0;corner<3;corner++){const mapped=map[mesh.bindIndices[at+corner]];if(mapped===undefined)return null;const point=importedRig.worldPoint(mapped);for(let axis=0;axis<3;axis++)anchor[axis]+=point[axis]*weights[corner];}
    return anchor;
  }
  function fitRigidHatToHead(mesh){
    const headPart=partById.head;if(!headPart?.restPositions||!headPart.positions)return null;
    const neutral=positionBounds(headPart.restPositions),current=positionBounds(headPart.positions),neutralSize=boundsSize(neutral),currentSize=boundsSize(current),hatBounds=positionBounds(mesh.restPositions),hatSize=boundsSize(hatBounds);
    // A hat is a rigid manufactured object. Follow the head with one uniform
    // scale and a translation, preserving the authored crown, brim and any
    // disconnected ribbons instead of pulling each vertex toward the scalp.
    let uniform=clamp(median([currentSize[0]/neutralSize[0],currentSize[1]/neutralSize[1],currentSize[2]/neutralSize[2]]),.78,1.22);
    if(hatRequiresBareScalp(mesh.catalog)){
      const scalpValues=[];for(let at=0;at<headPart.positions.length;at+=3)if(headPart.positions[at+1]>current.max[1]-.58)scalpValues.push(headPart.positions[at],headPart.positions[at+1],headPart.positions[at+2]);if(scalpValues.length){const scalp=boundsSize(positionBounds(scalpValues));uniform=clamp(Math.max(uniform,(scalp[0]+.018)/hatSize[0],(scalp[2]+.018)/hatSize[2]),.78,1.30);}
    }
    const translation=current.center.map((value,axis)=>value-neutral.center[axis]*uniform);let maxMotion=0,invalid=0;
    for(let at=0;at<mesh.restPositions.length;at+=3)for(let axis=0;axis<3;axis++){const value=mesh.restPositions[at+axis]*uniform+translation[axis];mesh.positions[at+axis]=value;maxMotion=Math.max(maxMotion,Math.abs(value-mesh.restPositions[at+axis]));if(!Number.isFinite(value))invalid++;}
    return {maxMotion,invalid:invalid/3,uniform};
  }
  function seatRigidHatOnScalp(mesh){
    const headPart=partById.head,head=headPart&&positionBounds(headPart.positions);if(!head||!mesh.bindSurfaceIndices||!mesh.bindNeutralAnchors)return 0;const neutralTop=positionBounds(headPart.restPositions).max[1],candidates=[];
    // Fit the rigid hat from signed scalp-normal distance, not from a vertical
    // bounding box. Crown-facing samples distinguish actual contact surfaces
    // from brims, veils, feathers and long decorative pieces.
    for(let vertex=0;vertex<mesh.positions.length/3;vertex++){const at=vertex*3;if(mesh.bindNeutralAnchors[at+1]<neutralTop-.38)continue;const anchor=currentSurfaceAnchor(mesh,at),points=[0,1,2].map(corner=>importedRig.worldPoint(mesh.bindSurfaceIndices[at+corner])),frame=outwardAttachmentFrame(points,anchor);if(anchor[1]<head.max[1]-.42||frame.n[1]<.28)continue;const position=[mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]],distance=dot(sub(position,anchor),frame.n);candidates.push({sourceDistance:mesh.bindSurfaceDistances?.[vertex]??Infinity,required:(.008-distance)/frame.n[1]});}
    if(candidates.length<8)return 0;const contactLimit=percentile(candidates.map(item=>item.sourceDistance),.18)+.012,required=candidates.filter(item=>item.sourceDistance<=contactLimit).map(item=>item.required);if(required.length<4)return 0;
    // The attachment proxy describes the bare scalp, while a real hat settles
    // slightly into hair and the soft tissue at the crown.  Seating directly
    // on the proxy percentile leaves wide-brimmed hats visibly suspended.  A
    // small, uniform settling allowance keeps the object rigid and avoids the
    // old per-vertex hat deformation.
    let correction=clamp(percentile(required,.86),-.22,.22)-.035;
    // Compact brimmed hats must never be seated through the brow just because
    // a brim vertex happens to be the closest proxy sample.  Use the head
    // height as an anatomical lower bound while leaving long caps, veils and
    // slouch styles free to extend down the sides of the head.
    const before=positionBounds(mesh.positions),height=before.max[1]-before.min[1],width=before.max[0]-before.min[0],wideBrim=width>height*1.35,foreheadFloor=head.max[1]-(wideBrim ? .37 : .30);if(height<.68)correction=Math.max(correction,foreheadFloor-before.min[1]);
    correction=clamp(correction,wideBrim?-.26:-.22,.26);for(let at=1;at<mesh.positions.length;at+=3)mesh.positions[at]+=correction;return Math.abs(correction);
  }
  function alignHairToScalp(mesh){
    const head=partById.head&&positionBounds(partById.head.positions);if(!head)return 0;const anchors=new Array(mesh.positions.length/3),gaps=[];
    for(let vertex=0;vertex<anchors.length;vertex++){const at=vertex*3,anchor=mesh.bindSurfaceIndices?currentSurfaceAnchor(mesh,at):currentProxyAnchor(mesh,at);anchors[vertex]=anchor;if(anchor&&anchor[1]>=head.max[1]-.43)gaps.push(mesh.positions[at+1]-anchor[1]);}
    const correction=gaps.length?clamp(.012-percentile(gaps,.08),-.34,.34):0,bounds=positionBounds(mesh.positions),xCorrection=clamp(head.center[0]-bounds.center[0],-.12,.12);let largest=Math.max(Math.abs(correction),Math.abs(xCorrection));
    for(let at=0;at<mesh.positions.length;at+=3){mesh.positions[at]+=xCorrection;mesh.positions[at+1]+=correction;}
    // Proxy anchors already identify the matching scalp point.  A small radial
    // clearance is enough to prevent crown skin from showing through, without
    // performing another nearest-triangle search for every hair vertex.
    for(let vertex=0;vertex<anchors.length;vertex++){const anchor=anchors[vertex];if(!anchor||anchor[1]<head.min[1]+.15)continue;const at=vertex*3,outwardNormal=normal([anchor[0]-head.center[0],(anchor[1]-head.center[1])*.55,anchor[2]-head.center[2]]),distance=(mesh.positions[at]-anchor[0])*outwardNormal[0]+(mesh.positions[at+1]-anchor[1])*outwardNormal[1]+(mesh.positions[at+2]-anchor[2])*outwardNormal[2],outward=clamp(.012-distance,0,.065);if(!outward)continue;for(let axis=0;axis<3;axis++)mesh.positions[at+axis]+=outwardNormal[axis]*outward;largest=Math.max(largest,outward);}
    // The face is not spherical, so a radial scalp correction alone can leave
    // forehead or temple polygons in front of a fringe.  Resolve only strands
    // whose proxy anchor is on the front half against a compact XY depth field;
    // back hair is deliberately excluded and cannot be pulled through the head.
    const cell=.025,bins=new Map(),key=(x,y)=>`${Math.floor(x/cell)},${Math.floor(y/cell)}`,headPositions=partById.head.positions;for(let at=0;at<headPositions.length;at+=3){const id=key(headPositions[at],headPositions[at+1]),front=bins.get(id);if(front===undefined||headPositions[at+2]>front)bins.set(id,headPositions[at+2]);}
    for(let vertex=0;vertex<anchors.length;vertex++){const anchor=anchors[vertex];if(!anchor||anchor[2]<head.center[2]-.02||anchor[1]<head.center[1]-.55)continue;const at=vertex*3,cx=Math.floor(mesh.positions[at]/cell),cy=Math.floor(mesh.positions[at+1]/cell);let front=-Infinity;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const value=bins.get(`${cx+dx},${cy+dy}`);if(value!==undefined)front=Math.max(front,value);}if(!Number.isFinite(front))continue;const forward=clamp(front+.010-mesh.positions[at+2],0,.14);if(!forward)continue;mesh.positions[at+2]+=forward;largest=Math.max(largest,forward);}
    return largest;
  }
  function enforceSurfaceClearance(mesh,minDistance,maxCorrection,accept=()=>true){
    if(!mesh.bindSurfaceIndices)return 0;let largest=0;
    for(let vertex=0;vertex<mesh.positions.length/3;vertex++){const at=vertex*3,anchor=currentSurfaceAnchor(mesh,at);if(!accept(anchor))continue;const points=[0,1,2].map(corner=>importedRig.worldPoint(mesh.bindSurfaceIndices[at+corner])),frame=boundAttachmentFrame(mesh,at,points,anchor),position=[mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]],distance=dot(sub(position,anchor),frame.n),correction=clamp(minDistance-distance,0,maxCorrection);if(!correction)continue;for(let axis=0;axis<3;axis++)mesh.positions[at+axis]+=frame.n[axis]*correction;largest=Math.max(largest,correction);}
    return largest;
  }
  function enforceFaceForwardClearance(mesh,minDistance=.010,maxCorrection=.120){
    const head=partById.head?.positions;if(!head)return 0;const cell=.03,bins=new Map(),key=(x,y)=>`${Math.floor(x/cell)},${Math.floor(y/cell)}`;let largest=0,maxRequired=0,adjusted=0;
    // Jaw and under-chin triangles legitimately point downwards, but a beard is
    // still a visible layer over the front of that surface. A normal-only
    // offset can therefore move the central beard down while leaving it behind
    // the face. Build a small XY depth field from the *current deformed head*
    // and place facial hair in front of that local envelope. This remains valid
    // for both body models and after cheek, mouth and jaw changes, even when a
    // proxy vertex was originally bound to the underside of the chin.
    for(let at=0;at<head.length;at+=3){const id=key(head[at],head[at+1]),front=bins.get(id);if(front===undefined||head[at+2]>front)bins.set(id,head[at+2]);}
    for(let at=0;at<mesh.positions.length;at+=3){if(mesh.positions[at+1]<2.08)continue;const cx=Math.floor(mesh.positions[at]/cell),cy=Math.floor(mesh.positions[at+1]/cell);let front=-Infinity;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const value=bins.get(`${cx+dx},${cy+dy}`);if(value!==undefined)front=Math.max(front,value);}if(!Number.isFinite(front))continue;const required=front+minDistance-mesh.positions[at+2];maxRequired=Math.max(maxRequired,required);const correction=clamp(required,0,maxCorrection);if(!correction)continue;mesh.positions[at+2]+=correction;adjusted++;largest=Math.max(largest,correction);}if(mesh.fitStats){mesh.fitStats.faceForwardAdjusted=adjusted;mesh.fitStats.faceForwardRequired=maxRequired;}
    return largest;
  }
  function alignShoesToFeet(mesh){
    let largest=0;
    for(const side of ['left','right']){
      const foot=partById[side+'_foot'];if(!foot)continue;const footBounds=positionBounds(foot.positions),indices=[],sign=side==='left'?-1:1;
      for(let at=0;at<mesh.positions.length;at+=3)if((mesh.restPositions[at]||mesh.positions[at])*sign>=0)indices.push(at);
      if(!indices.length)continue;const values=[];for(const at of indices)values.push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);const shoeBounds=positionBounds(values),shoeWidth=Math.max(.001,shoeBounds.max[0]-shoeBounds.min[0]),shoeDepth=Math.max(.001,shoeBounds.max[2]-shoeBounds.min[2]),shoeHeight=shoeBounds.max[1]-shoeBounds.min[1],footWidth=footBounds.max[0]-footBounds.min[0],footDepth=footBounds.max[2]-footBounds.min[2],boot=shoeHeight>.65,widthAllowance=boot?.14:.075,scaleX=clamp((footWidth+widthAllowance)/shoeWidth,.82,1.30),scaleZ=clamp((footDepth+.14)/shoeDepth,.82,1.28),targetY=footBounds.min[1]-.018,moveY=clamp(targetY-shoeBounds.min[1],-.22,.22),targetX=footBounds.center[0]-sign*(boot?.065:.012),targetZ=footBounds.center[2]+.025;
      for(const at of indices){const x=targetX+(mesh.positions[at]-shoeBounds.center[0])*scaleX,z=targetZ+(mesh.positions[at+2]-shoeBounds.center[2])*scaleZ;largest=Math.max(largest,Math.abs(x-mesh.positions[at]),Math.abs(moveY),Math.abs(z-mesh.positions[at+2]));mesh.positions[at]=x;mesh.positions[at+1]+=moveY;mesh.positions[at+2]=z;}
    }
    return largest;
  }
  function alignGlovesToHands(mesh){
    let largest=0;
    for(const side of ['left','right']){
      const limb=partById[side+'_forearm'];if(!limb)continue;const limbBounds=positionBounds(limb.positions),sign=side==='left'?-1:1,targetValues=[],indices=[];
      const distal=side==='left'?limbBounds.max[0]-(limbBounds.max[0]-limbBounds.min[0])*.52:limbBounds.min[0]+(limbBounds.max[0]-limbBounds.min[0])*.52;
      for(let at=0;at<limb.positions.length;at+=3)if(side==='left'?limb.positions[at]<distal:limb.positions[at]>distal)targetValues.push(limb.positions[at],limb.positions[at+1],limb.positions[at+2]);
      for(let at=0;at<mesh.positions.length;at+=3)if((mesh.restPositions[at]||mesh.positions[at])*sign>=0)indices.push(at);
      if(!indices.length||targetValues.length<9)continue;const sourceValues=[];for(const at of indices)sourceValues.push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);const source=positionBounds(sourceValues),target=positionBounds(targetValues),sourceSize=boundsSize(source),targetSize=boundsSize(target),scales=targetSize.map((value,axis)=>clamp((value+(axis===0?.20:.16))/sourceSize[axis],.82,1.70)),targetCenter=[target.center[0]-sign*.08,target.center[1],target.center[2]];
      for(const at of indices)for(let axis=0;axis<3;axis++){const value=targetCenter[axis]+(mesh.positions[at+axis]-source.center[axis])*scales[axis];largest=Math.max(largest,Math.abs(value-mesh.positions[at+axis]));mesh.positions[at+axis]=value;}
    }
    return largest;
  }
  function fitLowerLegLayer(mesh){
    if(!['Bottoms','Underlayers','Shoes'].includes(mesh.catalog?.category))return 0;const name=`${mesh.id} ${mesh.catalog?.name||''}`;if(mesh.catalog.category==='Underlayers'&&!/sock|stocking|pantyhose|leg.warmer/i.test(name))return 0;let largest=0;
    if(mesh.catalog.category==='Bottoms'&&Math.max(Math.abs(pose.leftHip||0),Math.abs(pose.rightHip||0),Math.abs(pose.leftKnee||0),Math.abs(pose.rightKnee||0))>5)return 0;
    for(const side of ['left','right']){const calf=partById[side+'_calf'];if(!calf)continue;const target=positionBounds(calf.positions),sign=side==='left'?-1:1,indices=[];for(let at=0;at<mesh.positions.length;at+=3)if((mesh.restPositions[at]||mesh.positions[at])*sign>=0&&mesh.positions[at+1]>target.min[1]-.18&&mesh.positions[at+1]<target.max[1]+.18)indices.push(at);if(indices.length<9)continue;const values=[];for(const at of indices)values.push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);const source=positionBounds(values),sourceSize=boundsSize(source),targetSize=boundsSize(target),scaleX=clamp((targetSize[0]+.07)/sourceSize[0],1,1.34),scaleZ=clamp((targetSize[2]+.07)/sourceSize[2],1,1.34);
      for(const at of indices){const x=target.center[0]+(mesh.positions[at]-source.center[0])*scaleX,z=target.center[2]+(mesh.positions[at+2]-source.center[2])*scaleZ;largest=Math.max(largest,Math.abs(x-mesh.positions[at]),Math.abs(z-mesh.positions[at+2]));mesh.positions[at]=x;mesh.positions[at+2]=z;}}
    return largest;
  }
  function fitBottomsOutsideLegSurface(mesh){
    if(mesh.catalog?.category!=='Bottoms')return 0;
    // The cross-section solver below is intentionally a neutral-stance body
    // form adjustment. Once a hip or knee rotates, horizontal world-Y slices
    // no longer describe a leg and would pull a valid trouser tube sideways.
    if(Math.max(Math.abs(pose.leftHip||0),Math.abs(pose.rightHip||0),Math.abs(pose.leftKnee||0),Math.abs(pose.rightKnee||0))>5)return 0;
    const binCount=32,clearance=.052;let largest=0,adjusted=0;
    for(const side of ['left','right']){
      const thigh=partById[`${side}_thigh`],calf=partById[`${side}_calf`];if(!thigh||!calf)continue;
      const sign=side==='left'?-1:1,body=[...thigh.positions,...calf.positions],pelvis=partById.pelvis?.positions;if(pelvis)for(let at=0;at<pelvis.length;at+=3)if(Math.abs(pelvis[at])<.035||(pelvis[at]<0?-1:1)===sign)body.push(pelvis[at],pelvis[at+1],pelvis[at+2]);const bodyBounds=positionBounds(body),yMin=bodyBounds.min[1],yMax=Math.min(.68,bodyBounds.max[1]),span=Math.max(.001,yMax-yMin),buckets=Array.from({length:binCount},()=>[]);
      for(let at=0;at<body.length;at+=3){const y=body[at+1];if(y<yMin||y>yMax)continue;if(Math.abs(body[at])>=.035&&(body[at]<0?-1:1)!==sign)continue;const bin=Math.max(0,Math.min(binCount-1,Math.round((y-yMin)/span*(binCount-1))));buckets[bin].push(body[at],body[at+2]);}
      const profiles=buckets.map((values,index)=>{if(values.length<8){values=[];for(let radius=1;radius<5&&values.length<8;radius++)for(const neighbour of [index-radius,index+radius])if(neighbour>=0&&neighbour<binCount)values.push(...buckets[neighbour]);}if(values.length<4)return null;const xs=[],zs=[];for(let at=0;at<values.length;at+=2){xs.push(values[at]);zs.push(values[at+1]);}const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);return {cx:(minX+maxX)*.5,cz:(minZ+maxZ)*.5,rx:Math.max(.025,(maxX-minX)*.5),rz:Math.max(.025,(maxZ-minZ)*.5)};});
      const nearestProfile=index=>{for(let radius=0;radius<binCount;radius++)for(const candidate of [index-radius,index+radius])if(candidate>=0&&candidate<binCount&&profiles[candidate])return profiles[candidate];return null;};
      for(let at=0;at<mesh.positions.length;at+=3){if((mesh.restPositions[at]<0?-1:1)!==sign)continue;const y=mesh.positions[at+1];if(y<yMin-.04||y>yMax+.04)continue;const position=clamp((y-yMin)/span*(binCount-1),0,binCount-1),low=Math.floor(position),high=Math.ceil(position),a=nearestProfile(low),b=nearestProfile(high);if(!a||!b)continue;const t=position-low,profile={cx:a.cx+(b.cx-a.cx)*t,cz:a.cz+(b.cz-a.cz)*t,rx:a.rx+(b.rx-a.rx)*t,rz:a.rz+(b.rz-a.rz)*t},dx=mesh.positions[at]-profile.cx,dz=mesh.positions[at+2]-profile.cz,radius=Math.hypot(dx/profile.rx,dz/profile.rz),required=1+clearance/Math.max(.035,Math.min(profile.rx,profile.rz));if(radius>=required)continue;let ux=dx,uz=dz;if(Math.hypot(ux,uz)<1e-6){ux=mesh.restPositions[at]-profile.cx;uz=mesh.restPositions[at+2]-profile.cz;}const normalized=Math.max(1e-6,Math.hypot(ux/profile.rx,uz/profile.rz)),factor=Math.min(1.45,required/normalized),x=profile.cx+ux*factor,z=profile.cz+uz*factor;largest=Math.max(largest,Math.abs(x-mesh.positions[at]),Math.abs(z-mesh.positions[at+2]));mesh.positions[at]=x;mesh.positions[at+2]=z;adjusted++;}
    }
    if(mesh.fitStats)mesh.fitStats.legShellAdjusted=adjusted;return largest;
  }
  function poseBottomsPoint(point){
    const side=point[0]<0?'left':'right',sign=point[0]<0?-1:1,hip=[sign*.42,-.30,0],knee=[sign*.42,-1.54,.06],hipWeight=step01(.16,-.52,point[1])*step01(.02,.28,Math.abs(point[0])),kneeWeight=step01(-1.28,-1.86,point[1]);
    const kneeBent=spinX(point,knee,(pose[side+'Knee']||0)*RAD),legLocal=blendPoint(point,kneeBent,kneeWeight),hipMoved=spinZ(legLocal,hip,sign*(pose[side+'Hip']||0)*RAD);
    return blendPoint(point,hipMoved,hipWeight);
  }
  function bodyPrimitiveBounds(kind){const values=[];for(let vertex=0;vertex<(importedRig?.vertexCount||0);vertex++)if(importedRig.primitiveKind?.(vertex)===kind)values.push(...importedRig.worldPoint(vertex));return values.length?positionBounds(values):null;}
  function transformAppearancePoint(id, point) {
    let p=point.slice(), x=p[0], y=p[1], z=p[2], side=x<0?-1:1, ax=Math.abs(x), isShirt=id.startsWith('shirt_');
    const female=bodySettings.modelType==='female',base=female?{chest:91,waist:74,shoulders:39}:{chest:96,waist:82,shoulders:44},safe=(value,baseline,strength=.64)=>clamp(1+(((Number(value)||baseline)/baseline)-1)*strength,.84,1.19);
    if(isShirt){
      const chest=safe(bodySettings.chestCm,base.chest),waist=safe(bodySettings.waistCm,base.waist),shoulders=safe(bodySettings.shoulderCm,base.shoulders,.62),chestW=step01(.72,1.12,y)*(1-step01(2.10,2.42,y)),waistW=step01(.10,.42,y)*(1-step01(.92,1.30,y)),shoulderW=step01(1.36,1.72,y)*(1-step01(2.35,2.66,y));
      p[0]*=1+(chest-1)*chestW+(waist-1)*waistW;p[2]*=1+(chest-1)*chestW*.84+(waist-1)*waistW*.82;p[0]+=side*(shoulders-1)*.56*shoulderW;
      if(female){
        const rawValue=Number(bodySettings.breastSize),value=Math.max(0,Math.min(400,Number.isFinite(rawValue)?rawValue:50)),amount=value<50?clamp((value-50)/50,-1,0):clamp((value-50)/250,0,1.4),large=Math.max(0,amount),dx=x-side*.285,dy=y-1.76,dz=z-.19,front=step01(.015,.20,z),chestGate=step01(1.30,1.48,y)*(1-step01(2.13,2.31,y)),width=.34+.050*large,height=.38+.070*large,depth=.36+.060*large,breast=Math.exp(-Math.pow(dx/width,2)-Math.pow(dy/height,2)-Math.pow(dz/depth,2))*front*chestGate,radial=amount*breast*(.52+.18*large);
        p[0]+=dx*.42*radial;p[1]+=dy*.58*radial-large*large*.035*breast;p[2]+=dz*.45*radial+amount*(.16+.12*large)*breast;
      }
      const sleeve=step01(.54,.94,ax)*step01(.55,1.10,y),shoulder=[side*.86,2.29,0],sideName=side<0?'left':'right';
      let posed=spinX(p,shoulder,-(pose[sideName+'ShoulderForward']||0)*RAD*.72);posed=spinZ(posed,shoulder,side*(pose[sideName+'Shoulder']||0)*RAD*.48);
      const twist=(pose[sideName+'ArmTwist']||0)*RAD*.34,ct=Math.cos(twist),st=Math.sin(twist),dy=p[1]-shoulder[1],dz=p[2]-shoulder[2],twisted=[p[0],shoulder[1]+ct*dy-st*dz,shoulder[2]+st*dy+ct*dz];
      posed=blendPoint(posed,twisted,Math.min(.38,sleeve*.38));p=blendPoint(p,posed,sleeve);
    }
    const heightScale=clamp((Number(bodySettings.heightCm)||178)/178,.78,1.22);p[1]=(p[1]+3.41)*heightScale-3.41;return p;
  }
  function makeHumanProxyCompatibility(mesh){
    if(mesh.proxyCompatibilityRig===importedRig&&mesh.proxyCompatibility)return mesh.proxyCompatibility;
    const map=baseVertexMap();if(!importedRig?.neutralPoint||!map||!mesh.bindIndices||!mesh.bindWeights||!mesh.bindOffsets)return {ok:false,median:Infinity,p95:Infinity,max:Infinity,invalid:mesh.restPositions.length/3};
    const pointAt=baseVertex=>{const mapped=map[baseVertex];return mapped===undefined?null:importedRig.neutralPoint(mapped);},scales=meshProxyScales(mesh,map,index=>importedRig.neutralPoint(index)),errors=[];let invalid=0;
    for(let vertex=0;vertex<mesh.restPositions.length/3;vertex++){const at=vertex*3,weights=meshBindingWeights(mesh,at),anchor=[0,0,0];let valid=true;for(let corner=0;corner<3;corner++){const point=pointAt(mesh.bindIndices[at+corner]);if(!point){valid=false;break;}for(let axis=0;axis<3;axis++)anchor[axis]+=point[axis]*weights[corner];}if(!valid){invalid++;continue;}const dx=anchor[0]+mesh.bindOffsets[at]*scales[0]-mesh.restPositions[at],dy=anchor[1]+mesh.bindOffsets[at+1]*scales[1]-mesh.restPositions[at+1],dz=anchor[2]+mesh.bindOffsets[at+2]*scales[2]-mesh.restPositions[at+2];errors.push(Math.hypot(dx,dy,dz));}
    const result={ok:!invalid&&median(errors)<.19&&percentile(errors,.95)<.26&&(errors.length?Math.max(...errors):Infinity)<.30,median:median([...errors]),p95:percentile([...errors],.95),max:errors.length?Math.max(...errors):Infinity,invalid};mesh.proxyCompatibilityRig=importedRig;mesh.proxyCompatibility=result;return result;
  }
  function updateMakeHumanBoundAsset(mesh){
    // Use the asset's authored MakeHuman proxy equation whenever it exists.
    // This preserves shoe soles, boot shafts and glove finger topology; the
    // former nearest-surface/AABB fallback distorted those disconnected forms.
    // Trouser proxies from several community packs target a different hm08
    // vertex ordering than the bundled body.  Replaying those numeric vertex
    // ids maps front shin panels onto the side or back of the leg.  Bottoms
    // therefore use the geometry-based surface binding below, which resolves
    // the authored proxy guides against the actual neutral body surface.
    if(rigidHeadCategories.has(mesh.catalog?.category))return false;
    const compatibility=mesh.catalog?.category==='Bottoms'?makeHumanProxyCompatibility(mesh):null;if(compatibility&&!compatibility.ok)return false;
    const map=baseVertexMap();if(!importedRig?.worldPoint||!map||!mesh.bindIndices||!mesh.bindWeights||!mesh.bindOffsets)return false;
    const pointAt=baseVertex=>{const mapped=map[baseVertex];return mapped===undefined?null:importedRig.worldPoint(mapped);},scales=meshProxyScales(mesh,map,index=>importedRig.worldPoint(index));
    let invalid=0,maxMotion=0,maxOffset=0;
    for(let vertex=0;vertex<mesh.restPositions.length/3;vertex++){
      const at=vertex*3,weights=meshBindingWeights(mesh,at),anchor=[0,0,0];let valid=true;
      for(let corner=0;corner<3;corner++){const point=pointAt(mesh.bindIndices[at+corner]);if(!point){valid=false;break;}for(let axis=0;axis<3;axis++)anchor[axis]+=point[axis]*weights[corner];}
      if(!valid){invalid++;continue;}
      for(let axis=0;axis<3;axis++){const offset=mesh.bindOffsets[at+axis]*scales[axis],value=anchor[axis]+offset;mesh.positions[at+axis]=value;maxOffset=Math.max(maxOffset,Math.abs(offset));maxMotion=Math.max(maxMotion,Math.abs(value-mesh.restPositions[at+axis]));if(!Number.isFinite(value))invalid++;}
    }
    mesh.fitStats={bound:true,deformationMode:'MakeHuman proxy binding',maxMotion,maxOffset,maxClearanceCorrection:0,invalidVertices:invalid,sourceError:null,proxyCompatibility:compatibility};return true;
  }
  function regularizeProxyDeformation(mesh,passes=2,strength=.45){
    const neutral=mesh.restPositions;if(!mesh.vertexNeighbours){const neighbours=Array.from({length:mesh.positions.length/3},()=>new Set());for(let at=0;at<mesh.indices.length;at+=3){const a=mesh.indices[at],b=mesh.indices[at+1],c=mesh.indices[at+2];neighbours[a].add(b).add(c);neighbours[b].add(a).add(c);neighbours[c].add(a).add(b);}mesh.vertexNeighbours=neighbours.map(set=>[...set]);}
    let field=new Float32Array(mesh.positions.length);for(let at=0;at<field.length;at++)field[at]=mesh.positions[at]-neutral[at];
    for(let pass=0;pass<passes;pass++){const next=field.slice();for(let vertex=0;vertex<mesh.vertexNeighbours.length;vertex++){const neighbours=mesh.vertexNeighbours[vertex];if(neighbours.length<2)continue;const at=vertex*3;for(let axis=0;axis<3;axis++){let average=0;for(const other of neighbours)average+=field[other*3+axis];average/=neighbours.length;next[at+axis]=field[at+axis]+(average-field[at+axis])*strength;}}field=next;}
    let largest=0;for(let at=0;at<mesh.positions.length;at++){const value=neutral[at]+field[at];largest=Math.max(largest,Math.abs(value-mesh.positions[at]));mesh.positions[at]=value;}return largest;
  }
  function weldCoincidentAssetSeams(mesh){
    // OBJ/glTF conversion duplicates a geometric vertex at every UV or
    // material boundary. MakeHuman proxy weights can then deform those copies
    // differently, opening the waist, inseam, sleeves and boot shafts even
    // though they occupied exactly the same source position. Keep the visual
    // split for texturing, but force each coincident group back to one deformed
    // position after all fitting operations.
    if(!mesh.seamGroups){const groups=new Map();for(let at=0;at<mesh.restPositions.length;at+=3){const key=`${Math.round(mesh.restPositions[at]*1e5)},${Math.round(mesh.restPositions[at+1]*1e5)},${Math.round(mesh.restPositions[at+2]*1e5)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(at);}mesh.seamGroups=[...groups.values()].filter(group=>group.length>1);}
    let largest=0;for(const group of mesh.seamGroups){const mean=[0,0,0];for(const at of group)for(let axis=0;axis<3;axis++)mean[axis]+=mesh.positions[at+axis]/group.length;for(const at of group)for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(mean[axis]-mesh.positions[at+axis]));mesh.positions[at+axis]=mean[axis];}}
    if(mesh.fitStats){mesh.fitStats.weldedSeams=mesh.seamGroups.length;mesh.fitStats.maxSeamCorrection=largest;}return largest;
  }
  function meshTopologyComponents(mesh){
    if(mesh.topologyComponents)return mesh.topologyComponents;const neighbours=Array.from({length:mesh.positions.length/3},()=>[]);for(let at=0;at<mesh.indices.length;at+=3){const ids=[mesh.indices[at],mesh.indices[at+1],mesh.indices[at+2]];for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){neighbours[ids[i]].push(ids[j]);neighbours[ids[j]].push(ids[i]);}}const seen=new Uint8Array(neighbours.length),components=[];for(let start=0;start<neighbours.length;start++){if(seen[start])continue;const stack=[start],component=[];seen[start]=1;while(stack.length){const vertex=stack.pop();component.push(vertex);for(const other of neighbours[vertex])if(!seen[other]){seen[other]=1;stack.push(other);}}if(component.length>=3)components.push(component);}return mesh.topologyComponents=components;
  }
  function detailComponentFrame(vertices,pointAt,basis=null){
    const origin=[0,0,0];for(const vertex of vertices){const point=pointAt(vertex);for(let axis=0;axis<3;axis++)origin[axis]+=point[axis]/vertices.length;}
    if(!basis){let first=vertices[0],firstDistance=-1;for(const vertex of vertices){const distance=Math.hypot(...sub(pointAt(vertex),origin));if(distance>firstDistance){first=vertex;firstDistance=distance;}}let second=first,secondDistance=-1;for(const vertex of vertices){const distance=Math.hypot(...sub(pointAt(vertex),pointAt(first)));if(distance>secondDistance){second=vertex;secondDistance=distance;}}const primary=normal(sub(pointAt(second),pointAt(first)));let third=first,thirdDistance=-1;for(const vertex of vertices){const delta=sub(pointAt(vertex),origin),perpendicular=sub(delta,scale(primary,dot(delta,primary))),distance=Math.hypot(...perpendicular);if(distance>thirdDistance){third=vertex;thirdDistance=distance;}}basis=[first,second,third];}
    const primary=normal(sub(pointAt(basis[1]),pointAt(basis[0]))),thirdDelta=sub(pointAt(basis[2]),origin),secondary=normal(sub(thirdDelta,scale(primary,dot(thirdDelta,primary)))),tertiary=normal(cross(primary,secondary)),axes=[primary,secondary,tertiary],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const vertex of vertices){const delta=sub(pointAt(vertex),origin);for(let axis=0;axis<3;axis++){const value=dot(delta,axes[axis]);min[axis]=Math.min(min[axis],value);max[axis]=Math.max(max[axis],value);}}
    return {origin,axes,extent:max.map((value,axis)=>Math.max(1e-6,value-min[axis])),basis};
  }
  function anatomicalPartFrame(id){
    const part=partById[id];if(!part?.restPositions||!part.positions)return null;const vertices=Array.from({length:part.restPositions.length/3},(_,index)=>index),neutral=detailComponentFrame(vertices,index=>{const at=index*3;return [part.restPositions[at],part.restPositions[at+1],part.restPositions[at+2]];}),current=detailComponentFrame(vertices,index=>{const at=index*3;return [part.positions[at],part.positions[at+1],part.positions[at+2]];},neutral.basis);return {neutral,current,scale:current.extent.map((value,axis)=>clamp(value/neutral.extent[axis],.72,1.38))};
  }
  function pointThroughAnatomicalFrame(point,frame){
    if(!frame)return point.slice();const local=frame.neutral.axes.map(axis=>dot(sub(point,frame.neutral.origin),axis)),result=frame.current.origin.slice();for(let localAxis=0;localAxis<3;localAxis++)for(let axis=0;axis<3;axis++)result[axis]+=frame.current.axes[localAxis][axis]*local[localAxis]*frame.scale[localAxis];return result;
  }
  function pointThroughRigidAnatomicalFrame(point,frame){
    if(!frame)return point.slice();const uniform=clamp(median(frame.scale.slice()),.78,1.24),local=frame.neutral.axes.map(axis=>dot(sub(point,frame.neutral.origin),axis)),result=frame.current.origin.slice();for(let localAxis=0;localAxis<3;localAxis++)for(let axis=0;axis<3;axis++)result[axis]+=frame.current.axes[localAxis][axis]*local[localAxis]*uniform;return result;
  }
  function fitRigidBodyAccessory(mesh,partId,rigid=false){
    const frame=anatomicalPartFrame(partId);if(!frame)return 0;let largest=0;for(let at=0;at<mesh.restPositions.length;at+=3){const source=[mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]],point=rigid?pointThroughRigidAnatomicalFrame(source,frame):pointThroughAnatomicalFrame(source,frame);for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(point[axis]-mesh.restPositions[at+axis]));mesh.positions[at+axis]=point[axis];}}return largest;
  }
  function fitPairedRigidAccessory(mesh,partName){
    const frames={left:anatomicalPartFrame(`left_${partName}`),right:anatomicalPartFrame(`right_${partName}`)};let largest=0;for(let at=0;at<mesh.restPositions.length;at+=3){const side=mesh.restPositions[at]<0?'left':'right',point=pointThroughRigidAnatomicalFrame([mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]],frames[side]);for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(point[axis]-mesh.restPositions[at+axis]));mesh.positions[at+axis]=point[axis];}}return largest;
  }
  function fitContinuousLimbLayer(mesh,kind){
    const lower=kind==='lower',frames={};for(const side of ['left','right'])frames[side]=lower?{distal:anatomicalPartFrame(`${side}_foot`),middle:anatomicalPartFrame(`${side}_calf`),proximal:anatomicalPartFrame(`${side}_thigh`)}:{distal:anatomicalPartFrame(`${side}_hand`),middle:anatomicalPartFrame(`${side}_forearm`),proximal:anatomicalPartFrame(`${side}_upper_arm`)};
    let largest=0;for(let at=0;at<mesh.restPositions.length;at+=3){const rest=[mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]],side=rest[0]<0?'left':'right',frame=frames[side];if(!frame.distal||!frame.middle||!frame.proximal)continue;const distal=pointThroughAnatomicalFrame(rest,frame.distal),middle=pointThroughAnatomicalFrame(rest,frame.middle),proximal=pointThroughAnatomicalFrame(rest,frame.proximal);let point;if(lower){const footWeight=step01(-2.94,-3.14,rest[1]),thighWeight=step01(-1.68,-1.40,rest[1]);point=blendPoint(blendPoint(middle,distal,footWeight),proximal,thighWeight);}else{const distance=Math.abs(rest[0]),handWeight=step01(1.43,1.66,distance),upperWeight=step01(1.12,.88,distance);point=blendPoint(blendPoint(middle,distal,handWeight),proximal,upperWeight);}for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(point[axis]-mesh.positions[at+axis]));mesh.positions[at+axis]=point[axis];}}
    return largest;
  }
  function expandPairedRigidAccessory(mesh,partName,amount){
    let largest=0;for(const side of ['left','right']){const sign=side==='left'?-1:1,frame=anatomicalPartFrame(`${side}_${partName}`);if(!frame)continue;const selected=[];for(let at=0;at<mesh.positions.length;at+=3)if((mesh.restPositions[at]<0?-1:1)===sign)selected.push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);if(!selected.length)continue;const center=positionBounds(selected).center,axis=frame.current.axes[0];for(let at=0;at<mesh.positions.length;at+=3){if((mesh.restPositions[at]<0?-1:1)!==sign)continue;const delta=sub([mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]],center),longitudinal=scale(axis,dot(delta,axis)),radial=sub(delta,longitudinal),next=add(add(center,longitudinal),scale(radial,1+amount));for(let world=0;world<3;world++){largest=Math.max(largest,Math.abs(next[world]-mesh.positions[at+world]));mesh.positions[at+world]=next[world];}}}return largest;
  }
  function shiftRigidAccessory(mesh,delta){let largest=0;for(let at=0;at<mesh.positions.length;at+=3)for(let axis=0;axis<3;axis++){mesh.positions[at+axis]+=delta[axis];largest=Math.max(largest,Math.abs(delta[axis]));}return largest;}
  function fitStandaloneWatch(mesh){
    const side=/right$/i.test(mesh.catalog?.placement||'')?'right':'left',forearm=partById[`${side}_forearm`],hand=partById[`${side}_hand`];if(!forearm||!hand)return 0;
    const points=values=>{const result=[];for(let at=0;at<values.length;at+=3)result.push([values[at],values[at+1],values[at+2]]);return result;},average=values=>values.reduce((sum,point)=>sum.map((value,index)=>value+point[index]/values.length),[0,0,0]),forearmPoints=points(forearm.positions),handPoints=points(hand.positions),forearmCenter=positionBounds(forearm.positions).center,handCenter=positionBounds(hand.positions).center,nearest=(values,target)=>values.map(point=>({point,distance:Math.hypot(...sub(point,target))})).sort((a,b)=>a.distance-b.distance).slice(0,Math.max(8,Math.floor(values.length*.035))).map(item=>item.point),forearmWrist=average(nearest(forearmPoints,handCenter)),handWrist=average(nearest(handPoints,forearmCenter)),axis=normal(sub(handWrist,forearmWrist)),center=blendPoint(forearmWrist,handWrist,.46);
    // Place the watch face on the anatomical front of the wrist. Projecting
    // the body-forward vector onto the wrist plane stays stable under arm
    // elevation and twist, unlike the previous PCA axis whose sign changed
    // with hand topology and put the watch halfway up the forearm.
    let outward=sub([0,0,1],scale(axis,dot([0,0,1],axis)));if(Math.hypot(...outward)<.1)outward=sub([0,1,0],scale(axis,dot([0,1,0],axis)));outward=normal(outward);const tangent=normal(cross(axis,outward)),band=forearmPoints.filter(point=>Math.abs(dot(sub(point,center),axis))<.085),radii=band.map(point=>{const delta=sub(point,center);return Math.hypot(...sub(delta,scale(axis,dot(delta,axis))));}),radius=clamp(percentile(radii,.72)+.003,.055,.095),faceValues=[],strapValues=[];for(let vertex=0;vertex<mesh.restPositions.length/3;vertex++){const at=vertex*3,target=mesh.watchParts?.[vertex]===0?faceValues:strapValues;target.push(mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]);}const faceBounds=positionBounds(faceValues),strapBounds=positionBounds(strapValues),faceScale=2.75,strapScale=2.45;let largest=0;
    for(let vertex=0;vertex<mesh.restPositions.length/3;vertex++){const at=vertex*3,sx=mesh.restPositions[at],sy=mesh.restPositions[at+1],sz=mesh.restPositions[at+2],face=mesh.watchParts?.[vertex]===0,point=center.slice();if(face){const components=[[axis,(sx-faceBounds.center[0])*faceScale],[tangent,(sz-faceBounds.center[2])*faceScale],[outward,radius+.006+(sy-faceBounds.min[1])*faceScale]];for(const [vector,amount] of components)for(let world=0;world<3;world++)point[world]+=vector[world]*amount;}else{const angle=(sz-strapBounds.center[2])*strapScale/radius,radial=add(scale(outward,Math.cos(angle)),scale(tangent,Math.sin(angle))),along=scale(axis,(sx-strapBounds.center[0])*faceScale),distance=radius+(sy-strapBounds.center[1])*strapScale;for(let world=0;world<3;world++)point[world]+=along[world]+radial[world]*distance;}for(let world=0;world<3;world++){largest=Math.max(largest,Math.abs(point[world]-mesh.positions[at+world]));mesh.positions[at+world]=point[world];}}
    return largest;
  }
  function wristLandmark(side){
    const forearm=partById[`${side}_forearm`],hand=partById[`${side}_hand`];if(!forearm||!hand)return null;const points=values=>{const result=[];for(let at=0;at<values.length;at+=3)result.push([values[at],values[at+1],values[at+2]]);return result;},average=values=>values.reduce((sum,point)=>sum.map((value,index)=>value+point[index]/values.length),[0,0,0]),forearmPoints=points(forearm.positions),handPoints=points(hand.positions),forearmCenter=positionBounds(forearm.positions).center,handCenter=positionBounds(hand.positions).center,nearest=(values,target)=>values.map(point=>({point,distance:Math.hypot(...sub(point,target))})).sort((a,b)=>a.distance-b.distance).slice(0,Math.max(8,Math.floor(values.length*.035))).map(item=>item.point),forearmWrist=average(nearest(forearmPoints,handCenter)),handWrist=average(nearest(handPoints,forearmCenter));return {center:blendPoint(forearmWrist,handWrist,.46),axis:normal(sub(handWrist,forearmWrist))};
  }
  function fitRigidWristAccessory(mesh){
    const source=positionBounds(mesh.restPositions),side=source.center[0]<0?'left':'right',frame=anatomicalPartFrame(`${side}_forearm`),landmark=wristLandmark(side);if(!frame||!landmark)return 0;let largest=0;for(let at=0;at<mesh.restPositions.length;at+=3){const rest=[mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]],point=pointThroughRigidAnatomicalFrame(rest,frame);for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(point[axis]-mesh.positions[at+axis]));mesh.positions[at+axis]=point[axis];}}const fitted=positionBounds(mesh.positions),delta=sub(landmark.center,fitted.center);for(let at=0;at<mesh.positions.length;at+=3)for(let axis=0;axis<3;axis++){mesh.positions[at+axis]+=delta[axis];largest=Math.max(largest,Math.abs(delta[axis]));}return largest;
  }
  function enforceLimbSurfaceEnvelope(mesh,partIds,clearance=.012){
    let largest=0,adjusted=0;
    for(const partId of partIds){
      const part=partById[partId],frame=anatomicalPartFrame(partId);if(!part?.positions||!frame)continue;const localBody=[],axes=frame.current.axes,origin=frame.current.origin;
      for(let at=0;at<part.positions.length;at+=3){const delta=sub([part.positions[at],part.positions[at+1],part.positions[at+2]],origin);localBody.push(axes.map(direction=>dot(delta,direction)));}
      const longitudinal=localBody.map(point=>point[0]),minLong=Math.min(...longitudinal),maxLong=Math.max(...longitudinal),span=Math.max(.001,maxLong-minLong),binCount=18,bins=Array.from({length:binCount},()=>[]);
      for(const point of localBody){const bin=clamp(Math.round((point[0]-minLong)/span*(binCount-1)),0,binCount-1);bins[bin].push(point[1],point[2]);}
      const profiles=bins.map((values,index)=>{if(values.length<8){values=[];for(let radius=1;radius<4&&values.length<8;radius++)for(const neighbour of [index-radius,index+radius])if(neighbour>=0&&neighbour<binCount)values.push(...bins[neighbour]);}if(values.length<4)return null;const a=[],b=[];for(let at=0;at<values.length;at+=2){a.push(values[at]);b.push(values[at+1]);}const minA=Math.min(...a),maxA=Math.max(...a),minB=Math.min(...b),maxB=Math.max(...b);return {ca:(minA+maxA)*.5,cb:(minB+maxB)*.5,ra:Math.max(.018,(maxA-minA)*.5),rb:Math.max(.018,(maxB-minB)*.5)};});
      const nearest=index=>{for(let radius=0;radius<binCount;radius++)for(const candidate of [index-radius,index+radius])if(candidate>=0&&candidate<binCount&&profiles[candidate])return profiles[candidate];return null;};
      for(let at=0;at<mesh.positions.length;at+=3){const side=partId.startsWith('left_')?-1:partId.startsWith('right_')?1:0;if(side&&(mesh.restPositions[at]<0?-1:1)!==side)continue;const position=[mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]],delta=sub(position,origin),local=axes.map(direction=>dot(delta,direction));if(local[0]<minLong-.035||local[0]>maxLong+.035)continue;const binPosition=clamp((local[0]-minLong)/span*(binCount-1),0,binCount-1),low=Math.floor(binPosition),high=Math.ceil(binPosition),a=nearest(low),b=nearest(high);if(!a||!b)continue;const t=binPosition-low,profile={ca:a.ca+(b.ca-a.ca)*t,cb:a.cb+(b.cb-a.cb)*t,ra:a.ra+(b.ra-a.ra)*t,rb:a.rb+(b.rb-a.rb)*t},da=local[1]-profile.ca,db=local[2]-profile.cb,radius=Math.hypot(da/profile.ra,db/profile.rb),required=1+clearance/Math.max(.018,Math.min(profile.ra,profile.rb));if(radius>=required||radius<.05)continue;const factor=Math.min(1.65,required/radius),nextLocal=[local[0],profile.ca+da*factor,profile.cb+db*factor],next=origin.slice();for(let frameAxis=0;frameAxis<3;frameAxis++)for(let worldAxis=0;worldAxis<3;worldAxis++)next[worldAxis]+=axes[frameAxis][worldAxis]*nextLocal[frameAxis];for(let worldAxis=0;worldAxis<3;worldAxis++){largest=Math.max(largest,Math.abs(next[worldAxis]-mesh.positions[at+worldAxis]));mesh.positions[at+worldAxis]=next[worldAxis];}adjusted++;}
    }
    if(mesh.fitStats)mesh.fitStats.limbEnvelopeAdjusted=(mesh.fitStats.limbEnvelopeAdjusted||0)+adjusted;return largest;
  }
  function fitCloseFittingLimbEnvelope(mesh){
    const item=mesh.catalog,name=`${item?.id||''} ${item?.name||''}`;let partIds=[],clearance=.012;
    if(item?.category==='Bottoms'){partIds=['left_thigh','right_thigh','left_calf','right_calf'];clearance=.026;}
    else if(item?.category==='Shoes'&&/boot|over.?knee|wellington|riding|high/i.test(name)){partIds=['left_calf','right_calf','left_thigh','right_thigh'];clearance=.018;}
    else if(item?.category==='Underlayers'&&/sock|stocking|pantyhose|leg.warmer/i.test(name)){partIds=['left_thigh','right_thigh','left_calf','right_calf'];clearance=.010;}
    else if(item?.category==='Underlayers'&&/armsleeve/i.test(name)){partIds=['left_upper_arm','right_upper_arm','left_forearm','right_forearm'];clearance=.009;}
    else if(['Tops','Dresses'].includes(item?.category)&&!/sleeveless|strap|halter|bandeau|apron|tank/i.test(name)){partIds=['left_upper_arm','right_upper_arm','left_forearm','right_forearm'];clearance=.016;}
    else if(item?.category==='Gloves'){partIds=['left_forearm','right_forearm'];clearance=.014;}
    return partIds.length?enforceLimbSurfaceEnvelope(mesh,partIds,clearance):0;
  }
  function alignShortGloveToHand(mesh){
    const referenced=new Uint8Array(mesh.positions.length/3);for(const vertex of mesh.indices)referenced[vertex]=1;let largest=0;
    for(const side of ['left','right']){const hand=partById[`${side}_hand`];if(!hand)continue;const sign=side==='left'?-1:1,values=[];for(let vertex=0;vertex<referenced.length;vertex++){const at=vertex*3;if(referenced[vertex]&&(mesh.restPositions[at]<0?-1:1)===sign)values.push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);}if(values.length<9)continue;const source=positionBounds(values),target=positionBounds(hand.positions),translation=target.center.map((value,axis)=>clamp(value-source.center[axis],-.24,.24));for(let at=0;at<mesh.positions.length;at+=3){if((mesh.restPositions[at]<0?-1:1)!==sign)continue;for(let axis=0;axis<3;axis++)mesh.positions[at+axis]+=translation[axis];}largest=Math.max(largest,...translation.map(Math.abs));}
    return largest;
  }
  function shiftGlovesDistally(mesh,distance=.055){
    let largest=0;for(const side of ['left','right']){const hand=partById[`${side}_hand`],forearm=partById[`${side}_forearm`];if(!hand||!forearm)continue;const handCenter=positionBounds(hand.positions).center,forearmCenter=positionBounds(forearm.positions).center,direction=sub(handCenter,forearmCenter),length=Math.hypot(...direction)||1,delta=direction.map(value=>value/length*distance),sign=side==='left'?-1:1;for(let at=0;at<mesh.positions.length;at+=3){if((mesh.restPositions[at]<0?-1:1)!==sign)continue;for(let axis=0;axis<3;axis++)mesh.positions[at+axis]+=delta[axis];}largest=Math.max(largest,...delta.map(Math.abs));}return largest;
  }
  function fitAuthoredExtremity(mesh){
    const shoes=mesh.catalog?.category==='Shoes',shortGlove=!shoes&&/mma|fingerless|open/i.test(`${mesh.id} ${mesh.catalog?.name||''}`),frames={};for(const side of ['left','right']){frames[side]={distal:anatomicalPartFrame(`${side}_${shoes?'foot':'hand'}`),proximal:anatomicalPartFrame(`${side}_${shoes?'calf':'forearm'}`)};}
    const gloveFits={};
    if(!shoes&&!shortGlove){const referenced=new Uint8Array(mesh.restPositions.length/3);for(const index of mesh.indices)referenced[index]=1;for(const side of ['left','right']){const sign=side==='left'?-1:1,sourceValues=[],targetValues=[],hand=partById[`${side}_hand`],forearm=partById[`${side}_forearm`];for(let vertex=0;vertex<referenced.length;vertex++){const at=vertex*3;if(referenced[vertex]&&(mesh.restPositions[at]<0?-1:1)===sign)sourceValues.push(mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]);}if(hand)targetValues.push(...hand.restPositions);if(forearm){const absolute=[];for(let at=0;at<forearm.restPositions.length;at+=3)absolute.push(Math.abs(forearm.restPositions[at]));const threshold=percentile(absolute,.72);for(let at=0;at<forearm.restPositions.length;at+=3)if(Math.abs(forearm.restPositions[at])>=threshold)targetValues.push(forearm.restPositions[at],forearm.restPositions[at+1],forearm.restPositions[at+2]);}if(sourceValues.length&&targetValues.length){const source=positionBounds(sourceValues),target=positionBounds(targetValues),sourceSize=boundsSize(source),targetSize=boundsSize(target),scaleByAxis=targetSize.map((value,axis)=>clamp((value+(axis===0?.025:.018))/sourceSize[axis],.25,1.35));gloveFits[side]={source,target,scaleByAxis};}}}
    let largest=0;
    for(let at=0;at<mesh.restPositions.length;at+=3){const rest=[mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]],side=rest[0]<0?'left':'right',fit=gloveFits[side],point=fit?fit.target.center.map((value,axis)=>value+(rest[axis]-fit.source.center[axis])*fit.scaleByAxis[axis]):rest,distal=pointThroughAnatomicalFrame(point,frames[side].distal),proximal=pointThroughAnatomicalFrame(point,frames[side].proximal),weight=shoes?1-step01(-3.18,-2.92,point[1]):step01(1.05,1.24,Math.abs(point[0])),value=blendPoint(proximal,distal,weight);for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(value[axis]-rest[axis]));mesh.positions[at+axis]=value[axis];}}
    if(shoes)largest=Math.max(largest,alignShoesToFeet(mesh),fitCloseFittingLimbEnvelope(mesh));else {if(shortGlove)largest=Math.max(largest,alignShortGloveToHand(mesh));largest=Math.max(largest,shiftGlovesDistally(mesh,shortGlove?.135:.070),fitCloseFittingLimbEnvelope(mesh));}return largest;
  }
  const nativeDetailComponentCache=new Map();
  function nativeDetailComponents(kind){
    let cached=nativeDetailComponentCache.get(kind),components=cached?.rig===importedRig?cached.components:null;
    if(!components){
      const selected=new Uint8Array(importedRig.vertexCount),neighbours=new Map();for(let vertex=0;vertex<selected.length;vertex++)if(importedRig.primitiveKind(vertex)===kind){selected[vertex]=1;neighbours.set(vertex,[]);}
      // Nail primitives live outside the tattoo-projectable surface vertex
      // range. Reconstruct their topology from the rendered body parts rather
      // than from surfaceTriangles, which intentionally excludes them.
      for(const part of parts){if(!part.sourceIndices)continue;const triangles=part.appearanceBaseIndices||part.indices;for(let at=0;at<triangles.length;at+=3){const ids=[part.sourceIndices[triangles[at]],part.sourceIndices[triangles[at+1]],part.sourceIndices[triangles[at+2]]].filter(id=>selected[id]);for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){neighbours.get(ids[i]).push(ids[j]);neighbours.get(ids[j]).push(ids[i]);}}}
      const seen=new Uint8Array(selected.length);components=[];for(const start of neighbours.keys()){if(seen[start])continue;const stack=[start],component=[];seen[start]=1;while(stack.length){const vertex=stack.pop();component.push(vertex);for(const other of neighbours.get(vertex))if(!seen[other]){seen[other]=1;stack.push(other);}}if(component.length>=3)components.push(component);}nativeDetailComponentCache.set(kind,{rig:importedRig,components});
    }
    return components.map(vertices=>{const neutralFrame=detailComponentFrame(vertices,index=>importedRig.neutralPoint(index)),currentFrame=detailComponentFrame(vertices,index=>importedRig.worldPoint(index),neutralFrame.basis);return {vertices,neutralFrame,currentFrame};});
  }
  function fitRingToRingFinger(mesh){
    const source=positionBounds(mesh.restPositions),authoredLeft=source.center[0]<0,side=authoredLeft?'left':'right',sign=side==='left'?-1:1,hand=partById[`${side}_hand`],targets=nativeDetailComponents('fingerNails').filter(target=>(target.currentFrame.origin[0]<0?-1:1)===sign);if(!hand||targets.length<5)return 0;
    // The thumb is the only nail substantially nearer the wrist in neutral
    // space. Of the four remaining nails, the ring finger is second from the
    // little-finger edge. This remains stable for either hand and through pose.
    const thumb=targets.reduce((best,target)=>target.neutralFrame.origin[1]>best.neutralFrame.origin[1]?target:best,targets[0]),fingers=targets.filter(target=>target!==thumb).sort((a,b)=>a.neutralFrame.origin[2]-b.neutralFrame.origin[2]),landmark=fingers[Math.min(1,fingers.length-1)],handCenter=positionBounds(hand.positions).center,longitudinal=normal(sub(handCenter,landmark.currentFrame.origin)),targetCenter=blendPoint(landmark.currentFrame.origin,handCenter,.58),vertices=Array.from({length:mesh.restPositions.length/3},(_,index)=>index),sourceFrame=detailComponentFrame(vertices,index=>{const at=index*3;return [mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]];}),thinAxis=sourceFrame.extent.indexOf(Math.min(...sourceFrame.extent)),radialAxes=[0,1,2].filter(axis=>axis!==thinAxis),guide=landmark.currentFrame.axes.reduce((best,axis)=>Math.abs(dot(axis,longitudinal))<Math.abs(dot(best,longitudinal))?axis:best,landmark.currentFrame.axes[0]),across=normal(sub(guide,scale(longitudinal,dot(guide,longitudinal)))),depth=normal(cross(longitudinal,across)),targetAxes=[];targetAxes[thinAxis]=longitudinal;targetAxes[radialAxes[0]]=across;targetAxes[radialAxes[1]]=depth;const radialSource=Math.max(sourceFrame.extent[radialAxes[0]],sourceFrame.extent[radialAxes[1]])*.5,targetRadius=clamp(Math.max(...landmark.currentFrame.extent)*.62,.018,.034),radialScale=targetRadius/Math.max(radialSource,1e-5),thinScale=.009/Math.max(sourceFrame.extent[thinAxis],1e-5);let largest=0;for(let at=0;at<mesh.restPositions.length;at+=3){const rest=[mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]],local=sourceFrame.axes.map(axis=>dot(sub(rest,sourceFrame.origin),axis)),point=targetCenter.slice();for(let localAxis=0;localAxis<3;localAxis++){const amount=local[localAxis]*(localAxis===thinAxis?thinScale:radialScale);for(let world=0;world<3;world++)point[world]+=targetAxes[localAxis][world]*amount;}for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(point[axis]-mesh.positions[at+axis]));mesh.positions[at+axis]=point[axis];}}return largest;
  }
  function alignDetailToNative(mesh,kind){
    const sourceComponents=meshTopologyComponents(mesh),allTargets=nativeDetailComponents(kind);if(!sourceComponents.length||!allTargets.length)return 0;
    const componentRecords=sourceComponents.map(vertices=>{const values=[];for(const vertex of vertices){const at=vertex*3;values.push(mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]);}return {vertices,rest:positionBounds(values),componentCount:1};}),targetCount=Math.min(10,allTargets.length);
    // Some MakeHuman toenail assets export the visible plate and its thin
    // underside as disconnected objects.  Matching those twenty shells one by
    // one can pair halves from neighbouring toes.  Cluster the nearest shells
    // on each foot first, so registration always moves one complete nail.
    const sourceRecords=[];
    for(const side of [-1,1]){
      const groups=componentRecords.filter(record=>(Math.sign(record.rest.center[0])||1)===side).map(record=>[record]),desired=Math.max(1,Math.round(targetCount/2));
      while(groups.length>desired){let pair=[0,1],distance=Infinity;for(let first=0;first<groups.length;first++)for(let second=first+1;second<groups.length;second++){const a=groups[first].reduce((sum,item)=>sum+item.rest.center[0],0)/groups[first].length,b=groups[second].reduce((sum,item)=>sum+item.rest.center[0],0)/groups[second].length,c=groups[first].reduce((sum,item)=>sum+item.rest.center[1],0)/groups[first].length,d=groups[second].reduce((sum,item)=>sum+item.rest.center[1],0)/groups[second].length,e=groups[first].reduce((sum,item)=>sum+item.rest.center[2],0)/groups[first].length,f=groups[second].reduce((sum,item)=>sum+item.rest.center[2],0)/groups[second].length,current=Math.hypot(a-b,c-d,e-f);if(current<distance){distance=current;pair=[first,second];}}groups[pair[0]].push(...groups[pair[1]]);groups.splice(pair[1],1);}
      for(const group of groups){const vertices=group.flatMap(record=>record.vertices),values=[];for(const vertex of vertices){const at=vertex*3;values.push(mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]);}sourceRecords.push({vertices,rest:positionBounds(values),componentCount:group.reduce((sum,item)=>sum+item.componentCount,0)});}
    }
    const usage=new Set(),assigned=[];let largest=0,matched=0;
    for(const side of [-1,1]){
      const sideSources=sourceRecords.filter(record=>(Math.sign(record.rest.center[0])||1)===side),sideTargets=allTargets.filter(target=>(Math.sign(target.neutralFrame.origin[0])||1)===side).sort((a,b)=>b.vertices.length-a.vertices.length).slice(0,sideSources.length);
      if(kind==='toeNails'){
        // Across different base bodies the spacing changes enough that a
        // nearest-centre assignment can swap the hallux and second toe.  Toe
        // order itself is invariant: nearest the body centre is the big toe,
        // then the remaining plates progress laterally.
        sideSources.sort((a,b)=>Math.abs(a.rest.center[0])-Math.abs(b.rest.center[0]));sideTargets.sort((a,b)=>Math.abs(a.neutralFrame.origin[0])-Math.abs(b.neutralFrame.origin[0]));
        for(let index=0;index<Math.min(sideSources.length,sideTargets.length);index++){const record=sideSources[index],target=sideTargets[index];usage.add(target);assigned.push({record,target});matched+=record.componentCount;}
      }else for(const record of sideSources){let targetRecord=null,bestDistance=Infinity;for(const target of sideTargets){if(usage.has(target))continue;const distance=Math.hypot(...sub(record.rest.center,target.neutralFrame.origin));if(distance<bestDistance){bestDistance=distance;targetRecord=target;}}if(!targetRecord)continue;usage.add(targetRecord);assigned.push({record,target:targetRecord});matched+=record.componentCount;}
    }
    for(const {record,target} of assigned){const neutral=target.neutralFrame,current=target.currentFrame,axisScale=current.extent.map((value,axis)=>clamp(value/neutral.extent[axis],.65,1.55));for(const vertex of record.vertices){const at=vertex*3,rest=[mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]],delta=sub(rest,record.rest.center),local=neutral.axes.map(axis=>dot(delta,axis)),value=current.origin.slice();for(let frameAxis=0;frameAxis<3;frameAxis++)for(let axis=0;axis<3;axis++)value[axis]+=current.axes[frameAxis][axis]*local[frameAxis]*axisScale[frameAxis];for(let axis=0;axis<3;axis++){largest=Math.max(largest,Math.abs(value[axis]-mesh.positions[at+axis]));mesh.positions[at+axis]=value[axis];}}}
    if(mesh.fitStats)mesh.fitStats.detailRegistration={sourceComponents:sourceComponents.length,sourceGroups:sourceRecords.length,targetComponents:allTargets.length,matched,targetMatched:assigned.length};
    return largest;
  }
  function fitFacialHairToMouth(mesh){
    const mouth=bodyPrimitiveBounds('mouth');if(!mouth||!mesh.bindSurfaceIndices||!mesh.vertexNeighbours)return 0;const count=mesh.positions.length/3,seeds=new Uint8Array(count),influence=new Float32Array(count);let seedCount=0;
    // Bindings that touch the lip surface are reliable anatomical landmarks.
    // Use topology rings around them so the moustache, mouth surround and
    // adjoining beard move as one continuous sheet instead of opening seams.
    for(let vertex=0;vertex<count;vertex++){const at=vertex*3;let hits=0;for(let corner=0;corner<3;corner++)if(importedRig.primitiveKind?.(mesh.bindSurfaceIndices[at+corner])==='mouth')hits++;if(hits){seeds[vertex]=1;influence[vertex]=1;seedCount++;}}
    if(seedCount<4)return 0;let frontier=seeds;
    for(let ring=1;ring<=3;ring++){const next=new Uint8Array(count),weight=1-ring*.22;for(let vertex=0;vertex<count;vertex++)if(frontier[vertex])for(const neighbour of mesh.vertexNeighbours[vertex])if(!influence[neighbour]){next[neighbour]=1;influence[neighbour]=Math.max(influence[neighbour],weight);}frontier=next;}
    const sourceValues=[];for(let vertex=0;vertex<count;vertex++)if(seeds[vertex]){const at=vertex*3;sourceValues.push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);}if(sourceValues.length<12)return 0;
    const source=positionBounds(sourceValues),sourceSize=boundsSize(source),mouthSize=boundsSize(mouth),beard=/beard/i.test(mesh.id),desiredWidth=mouthSize[0]*(beard?1.64:1.48)+.008,desiredHeight=mouthSize[1]*(beard?1.62:.72)+.008,scaleX=clamp(desiredWidth/sourceSize[0],.88,1.18),scaleY=clamp(desiredHeight/sourceSize[1],.86,1.16),targetY=mouth.center[1]+(beard ? .006 : mouthSize[1]*.58),targetFront=mouth.max[2]+.012,moveX=clamp(mouth.center[0]-source.center[0],-.035,.035),moveY=clamp(targetY-source.center[1],-.045,.045),scaledFront=source.center[2]+(source.max[2]-source.center[2]),moveZ=clamp(targetFront-scaledFront,-.018,.035);let largest=0;
    for(let vertex=0;vertex<count;vertex++){const weight=influence[vertex];if(!weight)continue;const at=vertex*3,desired=[source.center[0]+(mesh.positions[at]-source.center[0])*scaleX+moveX,source.center[1]+(mesh.positions[at+1]-source.center[1])*scaleY+moveY,mesh.positions[at+2]+moveZ];for(let axis=0;axis<3;axis++){const change=(desired[axis]-mesh.positions[at+axis])*weight;mesh.positions[at+axis]+=change;largest=Math.max(largest,Math.abs(change));}}
    return largest;
  }
  function sealCenteredGarment(mesh){
    if(!['Tops','Dresses','Bottoms','Skirts'].includes(mesh.catalog?.category)||/open|cardigan|jacket|coat|vest/i.test(mesh.id))return 0;
    let largest=0,count=0;
    // Closed garments often export the front centre as two coincident UV
    // borders. Independent proxy weights can pull those borders apart on wide
    // chests or hips. Preserve the authored centreline contact without
    // changing genuinely open-front garments.
    for(let at=0;at<mesh.positions.length;at+=3){if(Math.abs(mesh.restPositions[at])>.012)continue;const change=-mesh.positions[at];mesh.positions[at]=0;largest=Math.max(largest,Math.abs(change));count++;}
    if(mesh.fitStats)mesh.fitStats.centerlineVertices=count;
    return largest;
  }
  function updateMeshAppearanceAsset(mesh) {
    if(mesh.catalog?.category==='Hats'){
      // Hats are manufactured rigid objects. Never replay a per-vertex
      // MakeHuman proxy on them: that is what tore brims, squeezed crowns and
      // produced different shapes for the two body models. A single uniform
      // head-frame scale plus a scalp-contact translation preserves every
      // authored seam and decorative component.
      mesh.positions.set(mesh.restPositions);prepareSurfaceBindings(mesh);const fitted=fitRigidHatToHead(mesh),contact=seatRigidHatOnScalp(mesh);mesh.fitStats={bound:!!fitted,deformationMode:'rigid head fit',maxMotion:Math.max(fitted?.maxMotion||0,contact),maxOffset:0,maxClearanceCorrection:contact,invalidVertices:fitted?.invalid||0,uniformScale:fitted?.uniform||1,sourceError:mesh.bindSourceError};
      weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);return;
    }
    if(mesh.catalog?.category==='Shoes'){
      mesh.positions.set(mesh.restPositions);const motion=fitAuthoredExtremity(mesh);mesh.fitStats={bound:true,deformationMode:'authored per-foot frame transfer + per-foot contact alignment',maxMotion:motion,maxOffset:0,maxClearanceCorrection:0,invalidVertices:0,sourceError:null};weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);return;
    }
    if(mesh.catalog?.category==='Gloves'){
      // These assets already contain MakeHuman's vertex-level proxy binding.
      // Replacing that binding with a single limb frame sends fingers and cuff
      // panels through the torso. Preserve the authored field; use the rigid
      // extremity fallback only for an asset that genuinely has no proxy.
      mesh.positions.set(mesh.restPositions);const bound=updateMakeHumanBoundAsset(mesh),motion=bound?0:fitAuthoredExtremity(mesh);if(bound)mesh.fitStats.deformationMode+=' + authored hand and cuff fit';else mesh.fitStats={bound:true,deformationMode:'authored per-hand frame transfer + per-hand contact alignment',maxMotion:motion,maxOffset:0,maxClearanceCorrection:0,invalidVertices:0,sourceError:null};weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);return;
    }
    if(mesh.catalog?.placement?.startsWith('watch-')){
      mesh.positions.set(mesh.restPositions);const motion=fitStandaloneWatch(mesh);mesh.fitStats={bound:true,deformationMode:'rigid articulated wristwatch fit',maxMotion:motion,maxOffset:0,maxClearanceCorrection:0,invalidVertices:0,sourceError:null};weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);return;
    }
    if(mesh.catalog?.category==='Rings'){
      // A MakeHuman ring proxy already identifies its exact finger and follows
      // every knuckle. Applying a second landmark fit changes that identity and
      // was moving rings to the wrong digit. Only proxy-less rings need the
      // native ring-finger fallback.
      mesh.positions.set(mesh.restPositions);const bound=updateMakeHumanBoundAsset(mesh),motion=bound?0:fitRingToRingFinger(mesh);if(bound)mesh.fitStats.deformationMode+=' + authored ring-finger fit';else mesh.fitStats={bound:true,deformationMode:'native ring-finger registration',maxMotion:motion,maxOffset:0,maxClearanceCorrection:motion,invalidVertices:0,sourceError:null};weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);return;
    }
    if(mesh.catalog?.category==='Wrist accessories'){
      mesh.positions.set(mesh.restPositions);const bound=updateMakeHumanBoundAsset(mesh),motion=bound?0:fitRigidWristAccessory(mesh);if(bound)mesh.fitStats.deformationMode+=' + authored wrist fit';else mesh.fitStats={bound:true,deformationMode:'rigid anatomical wrist registration',maxMotion:motion,maxOffset:0,maxClearanceCorrection:0,invalidVertices:0,sourceError:null};weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);return;
    }
    if(mesh.catalog?.category==='Underlayers'&&/sock|stocking|pantyhose|leg.warmer/i.test(`${mesh.id} ${mesh.catalog?.name||''}`)){
      mesh.positions.set(mesh.restPositions);const bound=updateMakeHumanBoundAsset(mesh),motion=bound?0:fitContinuousLimbLayer(mesh,'lower');if(bound)mesh.fitStats.deformationMode+=' + authored foot, ankle and leg fit';else mesh.fitStats={bound:true,deformationMode:'continuous authored foot-calf-thigh frame transfer',maxMotion:motion,maxOffset:0,maxClearanceCorrection:0,invalidVertices:0,sourceError:null};weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);return;
    }
    if(updateMakeHumanBoundAsset(mesh)){
      // MakeHuman's authored proxy equation is the source of truth. It fits
      // each asset vertex to the same base vertices used by MakeHuman itself,
      // so body morphs and poses cannot detach footwear, hair or face details.
      if(mesh.catalog?.category==='Necklaces'){mesh.fitStats.deformationMode+=' + authored jewelry surface fit';}
      else if(mesh.catalog?.category==='Eyewear'){
        // A valid MakeHuman proxy is a good first-stage attachment, but its
        // source head is not guaranteed to share this model's eye spacing or
        // ear width. Apply the same rigid eye/ear registration used by
        // proxy-less frames so every lens sits over an eye and the temples
        // remain bounded by the head.
        mesh.fitStats.maxMotion=Math.max(mesh.fitStats.maxMotion,alignEyewearToFace(mesh));mesh.fitStats.deformationMode+=' + anatomical head frame registration';
      }
      else if(mesh.catalog?.category==='Hair'){mesh.fitStats.deformationMode+=' + authored scalp fit';}
      else if(mesh.catalog?.category==='Facial hair'){
        // MakeHuman facial hair already carries the same proxy binding as the
        // face. Preserve that authored mouth opening, and only prevent the mesh
        // from sinking through the skin. Radially reshaping the opening creates
        // broken moustache ends and angular holes on full beards.
        prepareSurfaceBindings(mesh);mesh.fitStats.maxMotion=Math.max(mesh.fitStats.maxMotion,regularizeProxyDeformation(mesh,4,.55),fitFacialHairToMouth(mesh),enforceSurfaceClearance(mesh,.014,.075,anchor=>anchor[1]>2.08),enforceFaceForwardClearance(mesh));mesh.fitStats.deformationMode+=' + topology-regularized landmark face fit';
      }
      else if(['Eyebrows','Eyelashes'].includes(mesh.catalog?.category)){prepareSurfaceBindings(mesh);mesh.fitStats.maxMotion=Math.max(mesh.fitStats.maxMotion,enforceSurfaceClearance(mesh,.003,.025,anchor=>anchor[1]>2.42));mesh.fitStats.deformationMode+=' + face-shape transfer';}
      else if(['Finger nails','Toe nails'].includes(mesh.catalog?.category)){prepareSurfaceBindings(mesh);const kind=mesh.catalog.category==='Finger nails'?'fingerNails':'toeNails';mesh.fitStats.maxMotion=Math.max(mesh.fitStats.maxMotion,alignDetailToNative(mesh,kind));mesh.fitStats.deformationMode+=' + native nail-surface registration';}
      else if(mesh.catalog?.category==='Shoes')mesh.fitStats.deformationMode+=' + per-foot authored proxy fit';
      else if(mesh.catalog?.category==='Gloves')mesh.fitStats.deformationMode+=' + per-hand authored proxy fit';
      else if(['Tops','Dresses','Bottoms','Skirts','Underlayers'].includes(mesh.catalog?.category)){
        // The proxy already maps every garment vertex to its intended body
        // neighbourhood.  Nearest-limb envelopes and world-space leg shells
        // applied after that mapping pulled disconnected panels across the
        // crotch, shoulder, forearm and ankle.  Preserve the authored field;
        // only reunite export duplicates in weldCoincidentAssetSeams below.
        mesh.fitStats.deformationMode+=' + authored garment fit';
      }
    }else if(rigidHeadCategories.has(mesh.catalog?.category)&&prepareSurfaceBindings(mesh)){
      const paired=pairedHeadCategories.has(mesh.catalog.category),groups={all:[[],[],[]],left:[[],[],[]],right:[[],[],[]]},count=mesh.restPositions.length/3,stride=Math.max(1,Math.floor(count/900));let invalid=0,maxMotion=0;
      for(let vertex=0;vertex<count;vertex+=stride){const at=vertex*3,ids=[mesh.bindSurfaceIndices[at],mesh.bindSurfaceIndices[at+1],mesh.bindSurfaceIndices[at+2]],weights=[mesh.bindSurfaceWeights[at],mesh.bindSurfaceWeights[at+1],mesh.bindSurfaceWeights[at+2]],anchor=[0,0,0];for(let corner=0;corner<3;corner++){const point=importedRig.worldPoint(ids[corner]);for(let axis=0;axis<3;axis++)anchor[axis]+=point[axis]*weights[corner];}const group=paired?(mesh.restPositions[at]<0?groups.left:groups.right):groups.all;for(let axis=0;axis<3;axis++)group[axis].push(anchor[axis]-mesh.bindGuidePositions[at+axis]);}
      const translations={};for(const [name,axes] of Object.entries(groups))translations[name]=axes.map(median);
      for(let vertex=0;vertex<count;vertex++){const at=vertex*3,translation=translations[paired?(mesh.restPositions[at]<0?'left':'right'):'all'];for(let axis=0;axis<3;axis++){const value=mesh.restPositions[at+axis]+translation[axis];mesh.positions[at+axis]=value;if(!Number.isFinite(value))invalid++;maxMotion=Math.max(maxMotion,Math.abs(translation[axis]));}}
      if(mesh.catalog.category==='Eyes')maxMotion=Math.max(maxMotion,alignEyesToSockets(mesh));
      else if(['Eyebrows','Eyelashes'].includes(mesh.catalog.category)){maxMotion=Math.max(maxMotion,alignPeriocularAsset(mesh));maxMotion=Math.max(maxMotion,enforceSurfaceClearance(mesh,.0025,.035,anchor=>anchor[1]>2.15));}
      else if(mesh.catalog.category==='Eyewear')maxMotion=Math.max(maxMotion,alignEyewearToFace(mesh));
      if(mesh.catalog.category==='Facial hair'){const mouth=bodyPrimitiveBounds('mouth'),bounds=positionBounds(mesh.positions),beard=/beard/i.test(mesh.id),amount=beard?[.72,.72,.72]:[.82,.72,.82],targetY=(mouth?.center[1]??2.75)+(beard?-.10:.105),targetX=mouth?.center[0]??0,targetFront=(mouth?.max[2]??.08)+.014,scaledFront=bounds.center[2]+(bounds.max[2]-bounds.center[2])*amount[2],translation=[targetX-bounds.center[0],targetY-bounds.center[1],targetFront-scaledFront];for(let at=0;at<mesh.positions.length;at+=3)for(let axis=0;axis<3;axis++)mesh.positions[at+axis]=bounds.center[axis]+(mesh.positions[at+axis]-bounds.center[axis])*amount[axis]+translation[axis];maxMotion=Math.max(maxMotion,...translation.map(Math.abs));}
      if(mesh.catalog.category==='Hair'){let top=-Infinity;for(let at=1;at<mesh.positions.length;at+=3)top=Math.max(top,mesh.positions[at]);if(top<2.65){const correction=3.15-top;for(let at=1;at<mesh.positions.length;at+=3)mesh.positions[at]+=correction;maxMotion=Math.max(maxMotion,correction);}}
      mesh.fitStats={bound:true,deformationMode:paired?'paired anatomical head frames':'rigid anatomical head frame',maxMotion,maxOffset:0,maxClearanceCorrection:0,invalidVertices:invalid/3,sourceError:mesh.bindSourceError};
    }else if(prepareSurfaceBindings(mesh)){
      let maxMotion=0,maxOffset=0,maxClearanceCorrection=0,invalid=0;const preserveAuthoredShape=['Tops','Dresses','Bottoms','Skirts','Underlayers','Shoes','Gloves'].includes(mesh.catalog?.category),clearance=appearanceClearance(mesh.catalog?.category);
      for(let vertex=0;vertex<mesh.restPositions.length/3;vertex++){
        const at=vertex*3,ids=[mesh.bindSurfaceIndices[at],mesh.bindSurfaceIndices[at+1],mesh.bindSurfaceIndices[at+2]],weights=[mesh.bindSurfaceWeights[at],mesh.bindSurfaceWeights[at+1],mesh.bindSurfaceWeights[at+2]],points=ids.map(index=>importedRig.worldPoint(index)),anchor=[0,0,0];
        for(let corner=0;corner<3;corner++)for(let axis=0;axis<3;axis++)anchor[axis]+=points[corner][axis]*weights[corner];const motion=[anchor[0]-mesh.bindNeutralAnchors[at],anchor[1]-mesh.bindNeutralAnchors[at+1],anchor[2]-mesh.bindNeutralAnchors[at+2]],local=[mesh.bindLocalOffsets[at],mesh.bindLocalOffsets[at+1],mesh.bindLocalOffsets[at+2]],rest=preserveAuthoredShape?mesh.restPositions:mesh.bindRestPositions;let position;
        if(mesh.catalog?.category==='Bottoms'){
          // Move the authored trouser topology through a continuous hip/knee
          // field first. The residual between that field and the body's actual
          // skinned attachment carries measurements and model-specific joint
          // corrections without letting neighbouring cloth vertices inherit
          // unrelated triangle frames at the crotch or knee.
          const neutralAnchor=[mesh.bindNeutralAnchors[at],mesh.bindNeutralAnchors[at+1],mesh.bindNeutralAnchors[at+2]],posedRest=poseBottomsPoint([mesh.restPositions[at],mesh.restPositions[at+1],mesh.restPositions[at+2]]),posedAnchor=poseBottomsPoint(neutralAnchor);position=posedRest.map((value,axis)=>value+anchor[axis]-posedAnchor[axis]);
        }else position=[rest[at]+motion[0],rest[at+1]+motion[1],rest[at+2]+motion[2]];
        if(preserveAuthoredShape){const frame=boundAttachmentFrame(mesh,at,points,anchor),distance=dot(sub(position,anchor),frame.n),correction=Math.min(.025,Math.max(0,clearance-distance));if(correction){for(let axis=0;axis<3;axis++)position[axis]+=frame.n[axis]*correction;maxClearanceCorrection=Math.max(maxClearanceCorrection,correction);}}maxMotion=Math.max(maxMotion,Math.hypot(...motion));maxOffset=Math.max(maxOffset,Math.hypot(...local));for(let axis=0;axis<3;axis++){const value=position[axis];mesh.positions[at+axis]=value;if(!Number.isFinite(value))invalid++;}
      }
      if(mesh.catalog?.category==='Shoes')maxMotion=Math.max(maxMotion,alignShoesToFeet(mesh),fitLowerLegLayer(mesh),enforceSurfaceClearance(mesh,appearanceClearance('Shoes'),.080));
      else if(mesh.catalog?.category==='Gloves')maxMotion=Math.max(maxMotion,alignGlovesToHands(mesh),enforceSurfaceClearance(mesh,appearanceClearance('Gloves'),.080));
      else if(mesh.catalog?.category==='Bottoms'){
        const legPose=Math.max(Math.abs(pose.leftHip||0),Math.abs(pose.rightHip||0),Math.abs(pose.leftKnee||0),Math.abs(pose.rightKnee||0));
        maxMotion=Math.max(maxMotion,regularizeProxyDeformation(mesh,legPose>5?8:2,legPose>5?.58:.26),fitLowerLegLayer(mesh),fitBottomsOutsideLegSurface(mesh),enforceSurfaceClearance(mesh,appearanceClearance('Bottoms'),.12),sealCenteredGarment(mesh));
      }
      else maxMotion=Math.max(maxMotion,sealCenteredGarment(mesh));
      mesh.fitStats={bound:true,deformationMode:mesh.catalog?.category==='Shoes'?'topology-preserving body displacement field + per-foot contact alignment':mesh.catalog?.category==='Gloves'?'topology-preserving body displacement field + per-hand contact alignment':preserveAuthoredShape?'topology-preserving body displacement field':'surface-fitted detail displacement field',maxMotion,maxOffset,maxClearanceCorrection,invalidVertices:invalid/3,sourceError:mesh.bindSourceError,proxyCompatibility:mesh.proxyCompatibility||null};
    }else {for(let i=0;i<mesh.restPositions.length;i+=3){const transformed=transformAppearancePoint(mesh.id,[mesh.restPositions[i],mesh.restPositions[i+1],mesh.restPositions[i+2]]);mesh.positions.set(transformed,i);}if(mesh.catalog?.category==='Eyewear'){const correction=alignEyewearToFace(mesh);mesh.fitStats={bound:true,deformationMode:'fallback rigid anatomical head frame',maxMotion:correction,minScale:1,maxScale:1,maxOffset:0,maxClearanceCorrection:0,invalidVertices:0,sourceError:null};}else mesh.fitStats={bound:false,minScale:1,maxScale:1,maxOffset:0,invalidVertices:0,sourceError:null};}
    weldCoincidentAssetSeams(mesh);recomputeNormals(mesh);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.DYNAMIC_DRAW);
  }
  function hatRequiresBareScalp(item){return item?.category==='Hats'&&/(?:swim|patrol|flat).?cap|beanie|knitted|sherpa|close.?fit/i.test(`${item.id} ${item.name||''}`);}
  function activeMeshAppearanceAssets(){
    const result=[],equipped=(bodySettings.equippedAssets||[]).map(id=>appearanceById.get(id)).filter(Boolean),hasGloves=equipped.some(item=>item.category==='Gloves'),closedFootwear=equipped.some(item=>item.category==='Shoes'&&!/sandal|flip|open|peep|barefoot/i.test(`${item.id} ${item.name||''}`)),tightHat=equipped.some(hatRequiresBareScalp);
    for(const item of equipped){const {id}=item;if((item.category==='Finger nails'&&hasGloves)||(item.category==='Toe nails'&&closedFootwear)||(item.category==='Hair'&&tightHat))continue;const hair=['Hair','Facial hair','Eyebrows','Eyelashes'].includes(item.category),dark=['Eyewear'].includes(item.category),eyes=item.category==='Eyes',groomingColour={'Facial hair':bodySettings.facialHairColor||'#3b2a22',Eyebrows:bodySettings.eyebrowColor||'#3b2a22',Eyelashes:bodySettings.eyelashColor||'#171412',Hair:bodySettings.hairColor||'#35261f'}[item.category];result.push({id,colour:eyes?(bodySettings.eyeColor||'#514c48'):(groomingColour||(dark?'#20262d':'#2e4551')),fabric:hair?0:.85,category:item.category});}
    const layer={'Finger nails':5,'Toe nails':5,Underlayers:10,Tops:20,Dresses:20,Bottoms:30,Skirts:30,Shoes:40,Gloves:40,'Body accessories':45,'Wrist accessories':46,Rings:47,Necklaces:48,Eyes:50,Eyebrows:51,Eyelashes:52,'Facial hair':53,Hair:54,Hats:55,Eyewear:56};return result.sort((a,b)=>(layer[a.category]||0)-(layer[b.category]||0));
  }
  let appearanceBodyMaskState={hiddenVertices:0,hiddenTriangles:0,totalTriangles:0};
  function authoredAppearanceCoverage(mesh){
    if(!mesh?.deleteVerts?.length||!importedRig)return null;
    const covered=new Uint8Array(importedRig.surfaceVertexCount),map=baseVertexMap(),positionKeys=new Set(),key=point=>`${Math.round(point[0]*1e5)},${Math.round(point[1]*1e5)},${Math.round(point[2]*1e5)}`;
    // A glTF export commonly splits one MakeHuman vertex at UV/material seams.
    // The generated map stores one representative only, so mark every exported
    // duplicate at the same neutral position or narrow seam slivers survive.
    for(const vertex of mesh.deleteVerts){const mapped=map?.[vertex];if(mapped!==undefined&&mapped<covered.length){covered[mapped]=1;positionKeys.add(key(importedRig.neutralPoint(mapped)));}}
    for(let vertex=0;vertex<covered.length;vertex++)if(positionKeys.has(key(importedRig.neutralPoint(vertex))))covered[vertex]=1;
    return covered;
  }
  function boundsAppearanceCoverage(mesh){
    const split=['Shoes','Gloves'].includes(mesh.catalog?.category),groups=split?[[],[]]:[[]];
    for(let at=0;at<mesh.positions.length;at+=3){const group=split&&mesh.restPositions[at]>=0?1:0;groups[group].push(mesh.positions[at],mesh.positions[at+1],mesh.positions[at+2]);}
    const regions=groups.filter(values=>values.length).map(values=>{const bounds=positionBounds(values),size=boundsSize(bounds),margin=[Math.min(.025,size[0]*.04),Math.min(.025,size[1]*.025),Math.min(.025,size[2]*.04)];return {bounds,margin};}),covered=new Uint8Array(importedRig.surfaceVertexCount);
    for(let vertex=0;vertex<covered.length;vertex++){const point=importedRig.worldPoint(vertex);if(regions.some(({bounds,margin})=>point[0]>bounds.min[0]+margin[0]&&point[0]<bounds.max[0]-margin[0]&&point[1]>bounds.min[1]+margin[1]&&point[1]<bounds.max[1]-margin[1]&&point[2]>bounds.min[2]+margin[2]&&point[2]<bounds.max[2]-margin[2]))covered[vertex]=1;}
    return covered;
  }
  function updateAppearanceBodyMask(){
    if(software||!importedRig)return;
    const hidden=new Uint8Array(importedRig.vertexCount),explicitAssets=[];
    for(const id of bodySettings.equippedAssets||[]){
      const mesh=ensureMeshAppearanceAsset(id),category=mesh?.catalog?.category;if(!mesh||!bodyOcclusionCategories.has(category))continue;
      if(mesh.fitRevision!==appearanceFitRevision){updateMeshAppearanceAsset(mesh);mesh.fitRevision=appearanceFitRevision;appearanceRefits++;}
      const coverage=authoredAppearanceCoverage(mesh);if(!coverage)continue;explicitAssets.push(id);for(let vertex=0;vertex<coverage.length;vertex++)if(coverage[vertex])hidden[vertex]=1;
    }
    let hiddenTriangles=0,totalTriangles=0;
    for(const part of parts){
      if(!part.sourceIndices)continue;
      if(!part.appearanceBaseIndices)part.appearanceBaseIndices=part.indices;
      const source=part.appearanceBaseIndices,visible=[];totalTriangles+=source.length/3;
      for(let at=0;at<source.length;at+=3){const a=part.sourceIndices[source[at]],b=part.sourceIndices[source[at+1]],c=part.sourceIndices[source[at+2]],covered=a<hidden.length&&b<hidden.length&&c<hidden.length&&hidden[a]+hidden[b]+hidden[c]===3;if(covered){hiddenTriangles++;continue;}visible.push(source[at],source[at+1],source[at+2]);}
      part.indices=new source.constructor(visible);part.count=part.indices.length;gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,part.indices,gl.DYNAMIC_DRAW);
    }
    appearanceBodyMaskState={hiddenVertices:hidden.reduce((sum,value)=>sum+value,0),hiddenTriangles,totalTriangles,explicitAssets:explicitAssets.length,derivedAssets:0,replacedPrimitives:[]};
  }
  // Never delete body triangles to make a garment appear opaque. MakeHuman's
  // delete_verts metadata belongs to its source mesh and is not reliable after
  // this app's model conversion, vertex splitting and body morphs: at cuffs,
  // hems and waistbands it can remove skin beyond the garment and reveal the
  // scene background. Physical depth plus fitted garment clearance is the
  // source of truth here, so the anatomical surface always remains continuous.
  const bodyOcclusionCategories=new Set();
  const opaqueAppearanceCategories=new Set(['Tops','Dresses','Bottoms','Skirts','Underlayers','Shoes','Gloves','Hats']);
  function appearanceUsesTextureTransparency(mesh){const opacity=Number(mesh?.material?.opacity);if(Number.isFinite(opacity)&&opacity<.985)return true;const sampled=mesh?.alphaMap;if(sampled&&Number.isFinite(sampled.sampledMean)&&(sampled.sampledLowFraction>.03||sampled.sampledMean<.94))return true;return /fishnet|transparent|sheer|lace|mesh|netting|tulle|veil/i.test(`${mesh?.id||''} ${mesh?.catalog?.name||''}`);}
  function renderMeshAppearanceAssets(){
    if(software)return;const active=activeMeshAppearanceAssets();if(!active.length)return;ensureMeshAppearanceProgram();const pgr=meshAppearanceProgram;gl.useProgram(pgr.instance);gl.uniformMatrix4fv(pgr.vp,false,viewProjection);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    for(const entry of active){
      const mesh=ensureMeshAppearanceAsset(entry.id);if(!mesh)continue;if(mesh.fitRevision!==appearanceFitRevision){updateMeshAppearanceAsset(mesh);mesh.fitRevision=appearanceFitRevision;appearanceRefits++;}
      const eyes=entry.category==='Eyes',grooming=['Hair','Facial hair','Eyebrows','Eyelashes'].includes(entry.category),tintedGrooming=['Hair','Facial hair','Eyebrows','Eyelashes'].includes(entry.category),source=eyes||grooming&&mesh.textureReady?(tintedGrooming?colour4(entry.colour||'#3b2a22'):[1,1,1,1]):grooming?colour4(entry.colour||'#35261f'):mesh.material.diffuseColor,colour=source?.length>=3?[source[0],source[1],source[2],Number.isFinite(mesh.material.opacity)?mesh.material.opacity:1]:colour4(entry.colour||'#2e4551'),accent=eyes?colour4(bodySettings.eyeColor||'#514c48'):colour4('#d0a36f'),fallback=mesh.textureAverage||colour,forceOpaque=opaqueAppearanceCategories.has(entry.category)&&!appearanceUsesTextureTransparency(mesh),depthBias={Underlayers:.0012,Tops:.0014,Dresses:.0014,Bottoms:.0015,Skirts:.0014,Shoes:.0016,Gloves:.0016,'Finger nails':.00016,'Toe nails':.00016,Hair:.00004,'Facial hair':.00005,Eyebrows:.00006,Eyelashes:.00007,Eyewear:.00004}[entry.category]||0;
      gl.uniform4fv(pgr.colour,colour);gl.uniform3fv(pgr.accent,accent.slice(0,3));gl.uniform3fv(pgr.atlasFallback,fallback.slice(0,3));gl.uniform1f(pgr.fabric,entry.fabric);gl.uniform1f(pgr.useTexture,mesh.textureReady?1:0);gl.uniform1f(pgr.forceOpaque,forceOpaque?1:0);gl.uniform1f(pgr.depthBias,depthBias);gl.uniform1f(pgr.shininess,clamp(Number(mesh.material.shininess)||0,0,1));gl.uniform1f(pgr.eye,eyes?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.uniform1i(pgr.texture,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.vertexAttribPointer(pgr.pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.pos);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.vertexAttribPointer(pgr.norm,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.norm);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.ub);gl.vertexAttribPointer(pgr.uv,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pgr.uv);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.indexType,0);
    }gl.disable(gl.BLEND);
  }

  refreshTexture = function refreshTextureV6(p) {
    const ctx = p.ctx, W = p.canvas.width, H = p.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = ({
      skin: bodySettings.skinTone || '#dfc8b3', cloth: '#82909c', areola: '#c29a88', nipple: '#ae8172',
      navel: '#8e6c5b', shadow: '#9d796a', eyewhite: '#f2eee8', iris: '#514c48', brow: '#8e7064', lip: bodySettings.lipColor || '#ba9485'
    }[p.color] || '#dfc8b3');
    ctx.fillRect(0, 0, W, H);
    if(p.id==='torso'&&p.restPositions&&p.uvs){
      const female=bodySettings.modelType==='female',volumeLift=female?clamp(((Number(bodySettings.breastSize)||50)-50)/350,0,1)*.026:0;p.nippleUVs=[];
      for(const sign of [-1,1]){let best=-1,front=-Infinity;for(let vertex=0;vertex<p.restPositions.length/3;vertex++){const at=vertex*3,x=p.restPositions[at],y=p.restPositions[at+1],z=p.restPositions[at+2];if((x<0?-1:1)!==sign||Math.abs(x)<.16||Math.abs(x)>.52||y<1.38||y>1.88)continue;if(z>front){front=z;best=vertex;}}if(best>=0){const u=p.uvs[best*2]+(sign<0?-.028:.028);p.nippleUVs.push([u,p.uvs[best*2+1]+volumeLift]);}}
      const skin=colour4(bodySettings.skinTone||'#dfc8b3').slice(0,3),natural=(scale,rose)=>`rgb(${skin.map((value,index)=>Math.round(clamp(value*scale+rose[index],0,1)*255)).join(',')})`,areola=natural(.72,[.095,.025,.022]),nipple=natural(.56,[.12,.032,.028]),areolaW=female?.011:.012,areolaH=female?.024:.017,nippleW=female?.004:.0045,nippleH=female?.0085:.0065;for(const uv of p.nippleUVs||[])for(const wrap of [-1,0,1]){const x=(uv[0]+wrap)*W,y=(1-uv[1])*H;ctx.fillStyle=areola;ctx.beginPath();ctx.ellipse(x,y,W*areolaW,H*areolaH,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=nipple;ctx.beginPath();ctx.ellipse(x,y,W*nippleW,H*nippleH,0,0,Math.PI*2);ctx.fill();}
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

  function renderProjectedDecals(xray=false) {
    if (software || !importedRig) return;
    ensureDecalProgram(); const live = new Set(tattoos.map(t => t.id));
    for (const [id, mesh] of decalMeshes) if (!live.has(id)) { for (const buffer of [mesh.pb, mesh.nb, mesh.ub, mesh.ib]) if (buffer) gl.deleteBuffer(buffer); if (mesh.texture) gl.deleteTexture(mesh.texture); decalMeshes.delete(id); }
    gl.useProgram(decalProgram); gl.uniformMatrix4fv(decalProgram.locations.vp, false, viewProjection); if(xray)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
    for (const tattoo of tattoos) {
      if (tattoo.hidden) continue;
      const mesh = ensureDecalMesh(tattoo); if (!mesh || !mesh.indices.length) continue; updateDecalPose(mesh);
      const risk = mesh.analysis?.grade || 'good', riskColour = risk === 'high' ? [.92, .23, .25] : risk === 'moderate' ? [1, .64, .16] : [.28, .78, .48];
      gl.uniform1f(decalProgram.locations.opacity, (tattoo.opacity ?? .92)*(xray&&clothingCoverage(tattoo.part,tattoo.v)?.38:1)); gl.uniform1f(decalProgram.locations.analysis, window.INK_ATLAS_ANALYSIS_ON ? 1 : 0); gl.uniform3fv(decalProgram.locations.analysisColor, riskColour); gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb); gl.vertexAttribPointer(decalProgram.locations.pos, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(decalProgram.locations.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb); gl.vertexAttribPointer(decalProgram.locations.norm, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(decalProgram.locations.norm); gl.bindBuffer(gl.ARRAY_BUFFER, mesh.ub); gl.vertexAttribPointer(decalProgram.locations.uv, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(decalProgram.locations.uv);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib); gl.bindTexture(gl.TEXTURE_2D, mesh.texture); gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.disable(gl.BLEND); gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
  }

  const drawSceneBase = drawScene;
  drawScene = function drawSceneWithProjectedDecals() {
    const shouldRender = dirtyScene;if(shouldRender)window.INK_ATLAS_BODY_CLIP_BOXES=appearanceBodyClipBoxes();drawSceneBase(); if (shouldRender) {
      // Ink is painted on the skin first. The depth buffer then lets every
      // garment hide precisely the pixels it physically covers.
      renderProjectedDecals();renderAppearanceLayers();renderMeshAppearanceAssets();
    }
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
        for (const key of ['chestCm', 'waistCm', 'hipsCm', 'bicepsCm', 'thighsCm', 'shoulderCm', 'breastSize', 'pecSize', 'buttSize', 'muscleDefinition']) if (Number.isFinite(imported.bodySettings[key])) bodySettings[key] = imported.bodySettings[key];
        { const importedBreastSize=Number(bodySettings.breastSize); bodySettings.breastSize=Number.isFinite(importedBreastSize)?Math.max(0,Math.min(400,importedBreastSize)):50; bodySettings.pecSize=clamp(Number(bodySettings.pecSize)||50,0,250);bodySettings.buttSize=clamp(Number(bodySettings.buttSize)||50,0,200);bodySettings.muscleDefinition=clamp(Number(bodySettings.muscleDefinition)||0,0,100); }
        for (const key of ['lipColor', 'lipTonePosition', 'hairColor', 'hairTonePosition', 'facialHairColor', 'facialHairTonePosition', 'eyebrowColor', 'eyebrowTonePosition', 'eyelashColor', 'eyelashTonePosition', 'eyeStyle', 'eyebrowStyle', 'eyelashStyle', 'fingerNailStyle', 'toeNailStyle', 'noseShape', 'earShape', 'cheekShape', 'eyeColor', 'renderQuality']) if (imported.bodySettings[key] !== undefined) bodySettings[key] = imported.bodySettings[key];
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
    if (modelHeading) modelHeading.textContent = 'Anatomical body';
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
      const defaults = next === 'female' ? {heightCm:165,chestCm:91,waistCm:74,hipsCm:99,bicepsCm:28,thighsCm:58,shoulderCm:39,breastSize:50,pecSize:50,buttSize:50} : {heightCm:178,chestCm:96,waistCm:82,hipsCm:96,bicepsCm:32,thighsCm:56,shoulderCm:44,breastSize:50,pecSize:50,buttSize:50};
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
      note.innerHTML = '<button type="button" class="model-note-toggle" aria-expanded="false"><span>Model details</span><b aria-hidden="true">＋</b></button><div class="model-note-body">Adjustable anatomical model · pose-aware movement · seam-aware tattoo projection.</div>';
      const toggle = note.querySelector('.model-note-toggle'), body = note.querySelector('.model-note-body');
      toggle.onclick = () => { const open = note.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.querySelector('b').textContent = open ? '−' : '＋'; body.hidden = !open; };
      body.hidden = true;
    }

    const overlay = document.createElement('div');
    overlay.className = 'model-loading';
    overlay.id = 'modelLoading';
    overlay.innerHTML = '<div class="model-loading-card"><strong>Preparing anatomical body</strong><span>Loading the model and fitting its movement controls.</span><div class="model-loading-line"></div></div>';
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
      hands: { target: [0, scaledY(.67), .34], distance: 8.0, label: 'Hands' },
      torso: { target: [0, scaledY(.92), 0], distance: 4.55, label: 'Torso' },
      pelvis: { target: [0, scaledY(-.16), 0], distance: 3.8, label: 'Pelvis' },
      legs: { target: [0, scaledY(-1.73), 0], distance: 6.1, label: 'Legs' },
      feet: { target: [0, scaledY(-3.18), .12], distance: 3.35, label: 'Feet' }
    };
    for(const [key,side] of [['leftHand','left'],['rightHand','right']]){const limb=partById[side+'_forearm'];if(!limb)continue;const bounds=positionBounds(limb.positions),threshold=side==='left'?bounds.max[0]-(bounds.max[0]-bounds.min[0])*.38:bounds.min[0]+(bounds.max[0]-bounds.min[0])*.38,values=[];for(let at=0;at<limb.positions.length;at+=3)if(side==='left'?limb.positions[at]<threshold:limb.positions[at]>threshold)values.push(limb.positions[at],limb.positions[at+1],limb.positions[at+2]);if(values.length){const hand=positionBounds(values);presets[key]={target:hand.center,distance:1.85,label:`${side==='left'?'Left':'Right'} hand`};}}
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
    tools.innerHTML = `<label for="bodyFocus">Focus</label><select id="bodyFocus" aria-label="Focus the camera on a body region"><option value="full">Full body</option><option value="head">Head</option><option value="upper">Upper body</option><option value="hands">Hands</option><option value="leftHand">Left hand</option><option value="rightHand">Right hand</option><option value="torso">Torso</option><option value="pelvis">Pelvis</option><option value="legs">Legs</option><option value="feet">Feet</option><option value="selected">Selected tattoo</option></select>`;
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

  let bundledModelLoadGeneration=0;
  async function loadBundledModel() {
    const generation=++bundledModelLoadGeneration;
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
      const loaded=await loadAnatomicalGLB(file,()=>generation===bundledModelLoadGeneration);
      if(!loaded||generation!==bundledModelLoadGeneration)return;
      updateAppearanceBodyMask();
      if (restoredPose) setPose(restoredPose);
      $('glCanvas').style.visibility = 'visible';
      const heightScale = bodySettings.heightCm / 178, armFactor = Math.max(pose.leftShoulder || 0, pose.rightShoulder || 0) / 155, legFactor=Math.max(Math.abs(pose.leftHip||0),Math.abs(pose.rightHip||0))/55;
      camTarget = [0, (.08 + armFactor * .32 + 3.41) * heightScale - 3.41, 0];
      camDist = clamp((matchMedia('(max-width: 780px)').matches ? 13.8 : 12.7) * heightScale + armFactor * 3.2 + legFactor * 1.4, 11, 18.5);
      requestDraw();
      modelStatus.textContent = `Anatomical body · ${importedRig.vertexCount.toLocaleString()} vertices · ready to pose.`;
      try { localStorage.removeItem('inkAtlas_model_load_error'); } catch (_) {}
      button.textContent = 'Reload realistic body';
    } catch (error) {
      modelStatus.textContent = error.message;
      $('glCanvas').style.visibility = 'hidden';
      try { localStorage.setItem('inkAtlas_model_load_error', JSON.stringify({
        release: '1.6.71', at: new Date().toISOString(), model: window.INK_ATLAS_SELECTED_BODY_MODEL,
        payloadLength: window.INK_ATLAS_MODEL_BASE64?.length || 0, message: error.message, stack: error.stack || '',
        webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
        userAgent: navigator.userAgent
      })); } catch (_) {}
      toast('The high-definition body could not load. Use Reload to try again.');
      console.error(error);
    } finally {
      if(generation!==bundledModelLoadGeneration)return;
      overlay.classList.remove('on');
      button.disabled = false;
    }
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
    ensureMeshAppearanceAsset(id);
    const multi=new Set(['Body accessories','Underlayers']);
    bodySettings.equippedAssets=(bodySettings.equippedAssets||[]).filter(current=>current!==id&&(multi.has(item.category)||appearanceById.get(current)?.category!==item.category));
    bodySettings.equippedAssets.push(id);syncNativeEyeVisibility();updateAppearanceBodyMask();parts.forEach(part=>part.dirty=true);requestDraw();return item;
  }
  function removeAppearanceAsset(id){bodySettings.equippedAssets=(bodySettings.equippedAssets||[]).filter(current=>current!==id);syncNativeEyeVisibility();updateAppearanceBodyMask();parts.forEach(part=>part.dirty=true);requestDraw();}
  function appearanceAssetStats(id){const mesh=meshAppearanceCache.get(id);if(!mesh)return null;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],restMin=[Infinity,Infinity,Infinity],restMax=[-Infinity,-Infinity,-Infinity],referenced=new Uint8Array(mesh.positions.length/3);for(const vertex of mesh.indices)referenced[vertex]=1;for(let vertex=0;vertex<referenced.length;vertex++){if(!referenced[vertex])continue;const i=vertex*3;for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],mesh.positions[i+axis]);max[axis]=Math.max(max[axis],mesh.positions[i+axis]);restMin[axis]=Math.min(restMin[axis],mesh.restPositions[i+axis]);restMax[axis]=Math.max(restMax[axis],mesh.restPositions[i+axis]);}}return {vertices:mesh.positions.length/3,renderedVertices:referenced.reduce((sum,value)=>sum+value,0),min,max,restMin,restMax,finite:[...min,...max].every(Number.isFinite)&&!mesh.fitStats?.invalidVertices,backingTriangles:(mesh.backing?.count||0)/3,materialOpacity:mesh.material?.opacity,alphaCoverage:mesh.alphaMap?{opaqueFraction:mesh.alphaMap.opaqueFraction,sampledOpaqueFraction:mesh.alphaMap.sampledOpaqueFraction,sampledLowFraction:mesh.alphaMap.sampledLowFraction,sampledMean:mesh.alphaMap.sampledMean}:null,textureTransparent:appearanceUsesTextureTransparency(mesh),...mesh.fitStats};}
  function bodyMorphRegionStats(){
    if(!importedRig?.neutralPoint||!importedRig?.worldPoint)return null;
    const regions={
      sternum:point=>Math.abs(point[0])<.065&&point[1]>1.38&&point[1]<2.02&&point[2]>.05,
      breastLobes:point=>Math.abs(Math.abs(point[0])-.285)<.19&&point[1]>1.35&&point[1]<2.10&&point[2]>.05,
      pecPlate:point=>Math.abs(point[0])>.09&&Math.abs(point[0])<.68&&point[1]>1.42&&point[1]<2.08&&point[2]>-.15,
      pecSternum:point=>Math.abs(point[0])<.025&&point[1]>1.45&&point[1]<2.04&&point[2]>-.15,
      centralPelvis:point=>Math.abs(point[0])<.12&&point[1]>-.68&&point[1]<.10&&point[2]<-.08,
      gluteLobes:point=>Math.abs(Math.abs(point[0])-.35)<.22&&point[1]>-.78&&point[1]<.08&&point[2]<-.08
    },result={};
    for(const [name,accept] of Object.entries(regions)){const sum=[0,0,0];let count=0;for(let vertex=0;vertex<importedRig.surfaceVertexCount;vertex++){const neutral=importedRig.neutralPoint(vertex);if(!accept(neutral))continue;const point=importedRig.worldPoint(vertex);for(let axis=0;axis<3;axis++)sum[axis]+=point[axis];count++;}result[name]={count,mean:count?sum.map(value=>value/count):[0,0,0]};}
    return result;
  }
  window.InkAtlasV7Bridge = {
    bodySettings, appearanceCatalog, measureTattooDistortion, decalMeshes, focusBodyRegion,
    equipAppearanceAsset, removeAppearanceAsset, appearanceAssetStats, bodyMorphRegionStats, bodyPartStats:id=>{const part=partById[id];return part?positionBounds(part.positions):null;}, visibleAppearanceAssetIds:()=>activeMeshAppearanceAssets().map(entry=>entry.id), appearanceBodyMaskStats:()=>({...appearanceBodyMaskState}), appearancePassStats:()=>appearancePasses().map(({part,bounds,worldMin,worldMax,offset})=>({part,bounds,worldMin,worldMax,offset})), appearanceClipStats:()=>appearanceBodyClipBoxes(), appearancePerformanceStats:()=>({fitRevision:appearanceFitRevision,refits:appearanceRefits}), isAppearanceAssetEquipped:id=>(bodySettings.equippedAssets||[]).includes(id),
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
