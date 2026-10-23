(() => {
  'use strict';

  const bridge = window.InkAtlasV7Bridge;
  if (!bridge) return;

  const UI_STORE = 'inkAtlas_v7_ui';
  const HISTORY_STORE = 'inkAtlas_v7_history';
  const PROJECT_STORE = 'inkAtlas_v7_projects';
  const settings = bridge.bodySettings;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
  const writeJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const ui = Object.assign({ guides:false, snap:true, grid:2.5, projectName:'Untitled placement', ikSide:'left' }, readJSON(UI_STORE, {}));
  let history = readJSON(HISTORY_STORE, []), historyIndex = history.length - 1, restoring = false, deferredInstall = null;
  const SKIN_STOPS = ['#3f291e','#69452f','#996848','#c99773','#dfc8b3','#f0d6c2'];
  const hexRGB = value => { const match=String(value||'').match(/^#([0-9a-f]{6})$/i); return match?[0,2,4].map(i=>parseInt(match[1].slice(i,i+2),16)):[223,200,179]; };
  const rgbHex = rgb => '#'+rgb.map(value=>Math.round(clamp(value,0,255)).toString(16).padStart(2,'0')).join('');
  function skinToneAt(position){const p=clamp(Number(position)||0,0,100)/100*(SKIN_STOPS.length-1),index=Math.min(SKIN_STOPS.length-2,Math.floor(p)),mix=p-index,a=hexRGB(SKIN_STOPS[index]),b=hexRGB(SKIN_STOPS[index+1]);return rgbHex(a.map((value,i)=>value+(b[i]-value)*mix));}
  function nearestSkinTonePosition(colour){const target=hexRGB(colour);let best=72,distance=Infinity;for(let p=0;p<=100;p++){const sample=hexRGB(skinToneAt(p)),d=sample.reduce((sum,value,i)=>sum+(value-target[i])**2,0);if(d<distance){distance=d;best=p;}}return best;}
  if(!Number.isFinite(Number(settings.skinTonePosition)))settings.skinTonePosition=nearestSkinTonePosition(settings.skinTone);

  const snapshot = (label = 'Edit') => ({
    label, at:new Date().toISOString(), tattoos:clone(tattoos), pose:clone(pose), body:clone(settings), selectedId
  });
  const stateSignature = state => JSON.stringify([state.tattoos, state.pose, state.body]);
  const saveUI = () => writeJSON(UI_STORE, ui);

  function recordHistory(label = 'Edit') {
    if (restoring) return;
    const next = snapshot(label);
    if (history[historyIndex] && stateSignature(history[historyIndex]) === stateSignature(next)) return;
    history = history.slice(0, historyIndex + 1);
    history.push(next);
    if (history.length > 40) history.shift();
    historyIndex = history.length - 1;
    writeJSON(HISTORY_STORE, history);
    updateHistoryButtons();
  }

  function restoreSnapshot(state) {
    if (!state) return;
    restoring = true;
    tattoos = clone(state.tattoos || []);
    Object.assign(settings, state.body || {});
    window.INK_ATLAS_BODY_PROFILE = settings.profile || 'balanced';
    selectedId = tattoos.some(t => t.id === state.selectedId) ? state.selectedId : (tattoos[0]?.id || null);
    setPose(state.pose || {});
    bridge.markAllDirty();
    updateUI();
    saveLayout(false);
    restoring = false;
  }

  function undo() { if (historyIndex > 0) { historyIndex--; restoreSnapshot(history[historyIndex]); updateHistoryButtons(); toast('Undid '+(history[historyIndex + 1]?.label || 'edit')); } }
  function redo() { if (historyIndex < history.length - 1) { historyIndex++; restoreSnapshot(history[historyIndex]); updateHistoryButtons(); toast('Redid '+(history[historyIndex]?.label || 'edit')); } }
  function updateHistoryButtons() {
    const undoBtn = $('v7Undo'), redoBtn = $('v7Redo');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
  }

  function activeProjectData() {
    return { name:ui.projectName, updated:new Date().toISOString(), current:snapshot('Autosave'), versions:[] };
  }
  function persistActiveProject() {
    const projects = readJSON(PROJECT_STORE, {}), current = projects[ui.projectName] || activeProjectData();
    current.name = ui.projectName; current.updated = new Date().toISOString(); current.current = snapshot('Autosave');
    current.versions = current.versions || [];
    projects[ui.projectName] = current; writeJSON(PROJECT_STORE, projects);
  }

  const originalSaveLayout = saveLayout;
  saveLayout = function saveLayoutV7(showToast = true) {
    originalSaveLayout(showToast);
    if (!restoring) { recordHistory('Placement edit'); persistActiveProject(); }
  };

  function toolbar() {
    const bar = document.createElement('nav');
    bar.className = 'v7-toolbar'; bar.setAttribute('aria-label', 'Project and placement tools');
    bar.innerHTML = `
      <div class="v7-project-title"><span>PROJECT</span><input id="v7ProjectName" value="${esc(ui.projectName)}" aria-label="Project name"></div>
      <div class="v7-tools">
        <button class="v7-tool" id="v7ProjectsBtn" aria-label="Projects"><span>▦</span><b>Projects</b></button><i></i>
        <button class="v7-tool" id="v7Undo" aria-label="Undo" title="Undo (Ctrl/Command Z)"><span>↶</span><b>Undo</b></button>
        <button class="v7-tool" id="v7Redo" aria-label="Redo" title="Redo (Ctrl/Command Shift Z)"><span>↷</span><b>Redo</b></button><i></i>
        <button class="v7-tool" id="v7Analyze" aria-label="Analyze distortion"><span>◎</span><b>Analyze</b></button>
        <button class="v7-tool" id="v7Guides" aria-label="Toggle placement guides"><span>＋</span><b>Guides</b></button>
        <button class="v7-tool" id="v7Stencil" aria-label="Export stencil"><span>▱</span><b>Stencil</b></button>
        <button class="v7-tool" id="v7Install" aria-label="Install app"><span>⇩</span><b>Install</b></button>
      </div><div class="v7-online" id="v7Online">● Local</div>`;
    document.querySelector('.top').after(bar);
    $('v7ProjectName').onchange = event => renameProject(event.target.value);
    $('v7ProjectsBtn').onclick = openProjects;
    $('v7Undo').onclick = undo; $('v7Redo').onclick = redo;
    $('v7Analyze').onclick = () => runPoseRange();
    $('v7Guides').onclick = toggleGuides;
    $('v7Stencil').onclick = exportStencil;
    $('v7Install').onclick = installApp;
    updateHistoryButtons(); updateGuideButton(); updateOnline();
  }

  function renameProject(value) {
    const name = String(value || '').trim() || 'Untitled placement';
    if (name === ui.projectName) return;
    const projects = readJSON(PROJECT_STORE, {}), previous = projects[ui.projectName];
    if (previous && !projects[name]) { projects[name] = previous; projects[name].name = name; delete projects[ui.projectName]; writeJSON(PROJECT_STORE, projects); }
    ui.projectName = name; $('v7ProjectName').value = name; saveUI(); persistActiveProject();
  }

  function projectThumbnail() {
    try { drawScene(); if (gl?.finish) gl.finish(); const image = canvas.toDataURL('image/jpeg', .55); return image.length < 350000 ? image : ''; } catch (_) { return ''; }
  }
  function openProjects() {
    const projects = readJSON(PROJECT_STORE, {}); persistActiveProject();
    let modal = $('v7ProjectModal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'v7ProjectModal'; modal.className = 'v7-modal'; document.body.append(modal); }
    const ordered = Object.values(readJSON(PROJECT_STORE, {})).sort((a,b) => String(b.updated).localeCompare(String(a.updated)));
    modal.innerHTML = `<div class="v7-dialog"><div class="v7-dialog-head"><div><span class="eyebrow">Local workspace</span><h2>Projects & versions</h2></div><button class="v7-close" aria-label="Close">×</button></div>
      <div class="v7-dialog-actions"><button class="btn gold" data-project-action="new">New project</button><button class="btn" data-project-action="version">Save named version</button></div>
      <div class="v7-project-grid">${ordered.map(project => `<article class="v7-project-card ${project.name===ui.projectName?'active':''}">${project.thumbnail?`<img src="${project.thumbnail}" alt="">`:'<div class="v7-project-placeholder">INK ATLAS</div>'}<div><b>${esc(project.name)}</b><small>${new Date(project.updated).toLocaleString()} · ${(project.current?.tattoos||[]).length} tattoos</small></div><div class="v7-card-actions"><button data-load="${esc(project.name)}">Load</button><button data-copy="${esc(project.name)}">Duplicate</button>${project.name!==ui.projectName?`<button data-delete="${esc(project.name)}">Delete</button>`:''}</div>${(project.versions||[]).length?`<details><summary>${project.versions.length} saved version${project.versions.length===1?'':'s'}</summary>${project.versions.slice().reverse().map((v,i)=>`<button class="v7-version" data-version-project="${esc(project.name)}" data-version-index="${project.versions.length-1-i}">${esc(v.label)} <small>${new Date(v.at).toLocaleString()}</small></button>`).join('')}</details>`:''}</article>`).join('') || '<p>No projects saved yet.</p>'}</div></div>`;
    modal.classList.add('open'); modal.querySelector('.v7-close').onclick = () => modal.classList.remove('open');
    modal.onclick = event => { if (event.target === modal) modal.classList.remove('open'); };
    modal.querySelector('[data-project-action="new"]').onclick = () => newProject();
    modal.querySelector('[data-project-action="version"]').onclick = () => saveVersion();
    modal.querySelectorAll('[data-load]').forEach(button => button.onclick = () => loadProject(button.dataset.load));
    modal.querySelectorAll('[data-copy]').forEach(button => button.onclick = () => duplicateProject(button.dataset.copy));
    modal.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => deleteProject(button.dataset.delete));
    modal.querySelectorAll('[data-version-project]').forEach(button => button.onclick = () => restoreVersion(button.dataset.versionProject, Number(button.dataset.versionIndex)));
  }
  function newProject() {
    persistActiveProject();
    const projects = readJSON(PROJECT_STORE, {}); let index = Object.keys(projects).length + 1, name = `Placement ${index}`;
    while (projects[name]) name = `Placement ${++index}`;
    ui.projectName = name; tattoos = []; selectedId = null; Object.assign(pose,{leftShoulder:18,rightShoulder:18,leftElbow:0,rightElbow:0,leftKnee:0,rightKnee:0});
    history = []; historyIndex = -1; applyPose(); bridge.markAllDirty(); updateUI(); saveUI(); recordHistory('New project'); persistActiveProject(); $('v7ProjectName').value = name; $('v7ProjectModal').classList.remove('open');
  }
  function loadProject(name) { const project = readJSON(PROJECT_STORE, {})[name]; if (!project) return; ui.projectName=name; saveUI(); restoreSnapshot(project.current); history=[snapshot('Loaded project')]; historyIndex=0; writeJSON(HISTORY_STORE,history); $('v7ProjectName').value=name; $('v7ProjectModal').classList.remove('open'); toast(`Loaded ${name}`); }
  function duplicateProject(name) { const projects=readJSON(PROJECT_STORE,{}), source=projects[name]; if(!source)return; let copy=`${name} copy`,i=2; while(projects[copy])copy=`${name} copy ${i++}`; projects[copy]=clone(source); projects[copy].name=copy; projects[copy].updated=new Date().toISOString(); writeJSON(PROJECT_STORE,projects); openProjects(); }
  function deleteProject(name) { if (!confirm(`Delete the local project “${name}”? Export a JSON backup first if needed.`)) return; const projects=readJSON(PROJECT_STORE,{}); delete projects[name]; writeJSON(PROJECT_STORE,projects); openProjects(); }
  function saveVersion() { const label=prompt('Name this version:',`Version ${new Date().toLocaleDateString()}`); if(!label)return; const projects=readJSON(PROJECT_STORE,{}), project=projects[ui.projectName]||activeProjectData(); project.current=snapshot('Version'); project.thumbnail=projectThumbnail(); project.versions=project.versions||[]; project.versions.push(Object.assign(snapshot(label),{label})); project.versions=project.versions.slice(-12); project.updated=new Date().toISOString(); projects[ui.projectName]=project; writeJSON(PROJECT_STORE,projects); toast('Named version saved'); openProjects(); }
  function restoreVersion(name,index) { const version=readJSON(PROJECT_STORE,{})[name]?.versions?.[index]; if(!version)return; ui.projectName=name; $('v7ProjectName').value=name; restoreSnapshot(version); saveUI(); persistActiveProject(); $('v7ProjectModal').classList.remove('open'); toast(`Restored ${version.label}`); }

  function installGuides() {
    const overlay=document.createElement('div'); overlay.id='v7GuidesOverlay'; overlay.className='v7-guides-overlay'; overlay.innerHTML='<span class="v7-guide-x"></span><span class="v7-guide-y"></span><span class="v7-guide-thirds a"></span><span class="v7-guide-thirds b"></span>';
    $('canvasWrap').append(overlay); overlay.classList.toggle('on',ui.guides);
  }
  function toggleGuides(){ ui.guides=!ui.guides; saveUI(); $('v7GuidesOverlay').classList.toggle('on',ui.guides); updateGuideButton(); }
  function updateGuideButton(){ const btn=$('v7Guides'); if(btn)btn.classList.toggle('active',ui.guides); }

  function installBodyLab() {
    const left=document.querySelector('.sidebar.left'), placement=Array.from(left.querySelectorAll('.eyebrow')).find(node=>node.textContent.includes('Placement note'));
    const section=document.createElement('details'); section.className='v7-body-lab'; section.open=true;
    section.innerHTML=`<summary>Measurements & appearance <span>8 controls</span></summary><div class="v7-body-content">
      <label>Frame<select id="v7Frame"><option value="balanced">Balanced</option><option value="soft">Soft</option><option value="angular">Angular</option><option value="androgynous">Androgynous</option></select></label>
      ${[['Chest','chestCm',78,125],['Waist','waistCm',62,120],['Hips','hipsCm',78,125],['Biceps','bicepsCm',22,48],['Thighs','thighsCm',40,76],['Shoulders','shoulderCm',34,57]].map(([label,key,min,max])=>`<label>${label}<span><input data-measure="${key}" type="range" min="${min}" max="${max}" value="${settings[key]}"><output>${settings[key]} cm</output></span></label>`).join('')}
      <label>Skin tone<span class="v7-skin-slider"><input id="v7SkinTone" type="range" min="0" max="100" step="1" value="${settings.skinTonePosition}" aria-label="Continuous skin tone"><output id="v7SkinToneOut">Tone ${Math.round(settings.skinTonePosition)}</output></span></label>
      <p>Measurements use smooth, bounded anatomical transitions to preserve the mesh surface. Height changes the visible stature and calibrates exported physical dimensions.</p></div>`;
    left.insertBefore(section, placement?.previousElementSibling || null); $('v7Frame').value=settings.frame||'balanced';
    $('v7Frame').onchange=event=>applyBodyChange('frame',event.target.value);
    section.querySelectorAll('[data-measure]').forEach(input=>input.oninput=()=>{ input.nextElementSibling.value=`${input.value} cm`; applyBodyChange(input.dataset.measure,Number(input.value),false); });
    section.querySelectorAll('[data-measure]').forEach(input=>input.onchange=()=>saveLayout(false));
    const tone=$('v7SkinTone'),toneOut=$('v7SkinToneOut');
    const updateTone=save=>{settings.skinTonePosition=Number(tone.value);const colour=skinToneAt(tone.value);tone.style.setProperty('--tone',colour);toneOut.value=`Tone ${tone.value}`;applyBodyChange('skinTone',colour,save);};
    tone.style.setProperty('--tone',skinToneAt(tone.value));tone.oninput=()=>updateTone(false);tone.onchange=()=>updateTone(true);
  }
  let bodyMorphFrame=0;
  function applyBodyChange(key,value,save=true){
    settings[key]=value;
    if(key==='skinTone'){
      parts.forEach(part=>part.dirty=true);bridge.markAllDirty();requestDraw();
    }else if(!bodyMorphFrame){
      bodyMorphFrame=requestAnimationFrame(()=>{bodyMorphFrame=0;applyPose();bridge.resetAnalysisBaselines?.();bridge.markAllDirty();requestDraw();});
    }
    if(save)saveLayout(false);
  }

  function installIK() {
    const grid=document.querySelector('.pose-grid'); if(!grid)return;
    const panel=document.createElement('div'); panel.className='v7-ik'; panel.innerHTML=`<div class="v7-ik-head"><span>Hand target</span><div><button data-ik-side="left">L</button><button data-ik-side="right">R</button></div></div><div class="v7-ik-pad" id="v7IkPad"><span id="v7IkHandle"></span><em>up</em><small>drag hand target</small></div><div class="v7-corrective">✓ Corrective shoulder skinning active</div>`;
    grid.prepend(panel); panel.querySelectorAll('[data-ik-side]').forEach(button=>button.onclick=()=>{ui.ikSide=button.dataset.ikSide;saveUI();updateIK();});
    const pad=$('v7IkPad'); const move=event=>{const rect=pad.getBoundingClientRect(),x=clamp((event.clientX-rect.left)/rect.width,0,1),y=clamp((event.clientY-rect.top)/rect.height,0,1),side=ui.ikSide; setPose({[side+'Shoulder']:Math.round((1-y)*155),[side+'Elbow']:Math.round((1-x)*130)}); updateIK();};
    pad.onpointerdown=event=>{pad.setPointerCapture(event.pointerId);move(event);}; pad.onpointermove=event=>{if(pad.hasPointerCapture(event.pointerId))move(event);}; pad.onpointerup=()=>saveLayout(false);
    const presets=document.querySelector('.pose-presets'); if(presets){ presets.insertAdjacentHTML('beforeend','<button class="btn tiny" id="v7ReachBtn">Reach overhead</button><button class="btn tiny" id="v7StrideBtn">Stride</button>'); $('v7ReachBtn').onclick=()=>{setPose({leftShoulder:150,rightShoulder:150,leftElbow:8,rightElbow:8});bridge.focusBodyRegion('full');camDist=Math.min(18.5,Math.max(camDist,16.3*(settings.heightCm/178)));requestDraw();saveLayout(false)}; $('v7StrideBtn').onclick=()=>{setPose({leftShoulder:10,rightShoulder:28,leftElbow:15,rightElbow:25,leftKnee:32,rightKnee:4});saveLayout(false)}; }
    updateIK();
  }
  function updateIK(){ const pad=$('v7IkPad'),handle=$('v7IkHandle');if(!pad||!handle)return;const side=ui.ikSide,x=1-clamp(pose[side+'Elbow']/130,0,1),y=1-clamp(pose[side+'Shoulder']/155,0,1);handle.style.left=`${x*100}%`;handle.style.top=`${y*100}%`;document.querySelectorAll('[data-ik-side]').forEach(b=>b.classList.toggle('active',b.dataset.ikSide===side)); }

  function installAnalysis() {
    const panel=document.createElement('section'); panel.id='v7Analysis'; panel.className='v7-section'; panel.innerHTML='<div class="panel-head"><div class="section-label">Surface analysis</div><label class="v7-switch"><input id="v7Heatmap" type="checkbox"><span></span> Heatmap</label></div><div id="v7AnalysisBody" class="detailtxt">Select a tattoo to measure deformation across the current pose.</div>';
    document.querySelector('.sidebar.right').insertBefore(panel,document.querySelector('.sidebar.right .placements').previousElementSibling);
    $('v7Heatmap').onchange=event=>{window.INK_ATLAS_ANALYSIS_ON=event.target.checked;requestDraw();};
  }
  function analysisHTML(tattoo) {
    if(!tattoo)return 'Select a tattoo to measure deformation across the current pose.';
    const current=bridge.measureTattooDistortion(tattoo), tested=tattoo.analysisVersion===3?tattoo.analysisResult:null, result=tested||current, rows=tattoo.analysisVersion===3?(tattoo.analysisResults||[]):[];
    return `<div class="v7-risk ${result?.grade||'good'}"><b>${result?.grade==='high'?'High':result?.grade==='moderate'?'Moderate':'Low'} deformation risk</b><span>${result?.percent||0}% local stretch</span></div><div class="v7-legend"><i></i> low <i></i> moderate <i></i> high</div><button class="btn tiny" id="v7RangeTest">Test both shoulders, elbows & knees</button>${rows.length?`<div class="v7-joint-results" aria-label="Bilateral joint analysis">${rows.map(row=>`<div class="v7-joint-row ${row.grade}"><span>${esc(row.label)}</span><i><b style="width:${clamp(row.percent,0,100)}%"></b></i><output>${row.percent}%</output></div>`).join('')}</div><p>Worst tested pose: ${esc(tested.poseLabel)}. Each row tests that joint independently on both sides, combining skinned-surface stretch with a local elbow/knee crease estimate.</p>`:'<p>Current-pose estimate. Run the bilateral range test to check both shoulders, both elbows and both knees.</p>'}`;
  }
  function renderAnalysis(){ const tattoo=tattoos.find(t=>t.id===selectedId),body=$('v7AnalysisBody'); if(!body)return; body.innerHTML=analysisHTML(tattoo); const button=$('v7RangeTest');if(button)button.onclick=()=>runPoseRange(tattoo); }
  const JOINT_TESTS=[
    {key:'leftShoulder',label:'Left shoulder',limit:155},{key:'rightShoulder',label:'Right shoulder',limit:155},
    {key:'leftElbow',label:'Left elbow',limit:145},{key:'rightElbow',label:'Right elbow',limit:145},
    {key:'leftKnee',label:'Left knee',limit:135},{key:'rightKnee',label:'Right knee',limit:135}
  ];
  function jointCreaseEstimate(tattoo,joint,angle){
    const partId=tattoo?.part||'',side=joint.key.startsWith('left')?'left':'right';if(!partId.startsWith(side+'_'))return 0;
    const elbow=joint.key.endsWith('Elbow'),knee=joint.key.endsWith('Knee');if(!elbow&&!knee)return 0;
    const upper=elbow&&partId.endsWith('upper_arm'),lower=elbow&&partId.endsWith('forearm'),thigh=knee&&partId.endsWith('thigh'),calf=knee&&partId.endsWith('calf');if(!upper&&!lower&&!thigh&&!calf)return 0;
    const part=partById[partId],asset=assetMap()[tattoo.asset];if(!part||!asset)return 0;
    const edgeV=upper||thigh?0:1,distance=Math.abs((tattoo.v??.5)-edgeV),halfHeight=clamp((Math.max(.025,(tattoo.size||.1)*part.circumference)/(asset.ratio||1))/(part.length||1)*.5,.015,.55),falloff=knee?.24:.21,coverage=clamp(1-Math.max(0,distance-halfHeight)/falloff,0,1),bend=Math.sin(clamp(angle/joint.limit,0,1)*Math.PI*.5);
    return (knee?.34:.29)*coverage*Math.pow(bend,1.18);
  }
  function withJointEstimate(result,tattoo,joint,angle){
    const max=Math.max(result?.max||0,jointCreaseEstimate(tattoo,joint,angle)),average=Math.max(result?.average||0,max*.38);return {max,average,percent:Math.round(max*100),grade:max>.24?'high':max>.11?'moderate':'good'};
  }
  async function runPoseRange(tattoo=tattoos.find(t=>t.id===selectedId)){
    if(!tattoo){toast('Select a tattoo to analyze');return;}
    const original=clone(pose),neutral={leftShoulder:0,rightShoulder:0,leftElbow:0,rightElbow:0,leftKnee:0,rightKnee:0},button=$('v7Analyze'),body=$('v7AnalysisBody');let worst={max:0,percent:0,grade:'good',poseLabel:'neutral'},results=[];
    bridge.resetAnalysisBaselines?.();Object.assign(pose,neutral);applyPose();bridge.measureTattooDistortion(tattoo);button?.classList.add('busy');
    for(let index=0;index<JOINT_TESTS.length;index++){
      const joint=JOINT_TESTS[index],angles=[0,Math.round(joint.limit*.25),Math.round(joint.limit*.5),Math.round(joint.limit*.75),joint.limit];let jointWorst={max:0,percent:0,grade:'good',poseLabel:`${joint.label} neutral`};
      if(body)body.innerHTML=`<div class="v7-analysis-progress"><b>Testing ${esc(joint.label)}</b><span>${index+1} / ${JOINT_TESTS.length}</span><i><b style="width:${Math.round(index/JOINT_TESTS.length*100)}%"></b></i></div>`;
      for(const angle of angles){Object.assign(pose,neutral,{[joint.key]:angle});applyPose();const result=withJointEstimate(bridge.measureTattooDistortion(tattoo),tattoo,joint,angle);if(result.max>=jointWorst.max)jointWorst=Object.assign({},result,{poseLabel:`${joint.label.toLowerCase()} ${angle}°`});await new Promise(resolve=>requestAnimationFrame(resolve));}
      results.push(Object.assign({},jointWorst,{key:joint.key,label:joint.label}));if(jointWorst.max>=worst.max)worst=jointWorst;
    }
    Object.assign(pose,original);applyPose();tattoo.analysisResult=worst;tattoo.analysisResults=results;tattoo.analysisVersion=3;saveLayout(false);renderAnalysis();requestDraw();button?.classList.remove('busy');toast(`Six-joint test complete · ${worst.percent}% worst-case stretch`);
  }

  function enhanceInspector() {
    const host=$('inspector'), tattoo=tattoos.find(t=>t.id===selectedId); if(!tattoo||host.querySelector('.v7-inspector'))return;
    const block=document.createElement('div');block.className='v7-inspector';block.innerHTML=`<details open><summary>Exact placement & guides</summary><div class="v7-exact-grid"><label>Horizontal %<input data-exact="u" type="number" min="0" max="100" step="0.5" value="${(tattoo.u*100).toFixed(1)}"></label><label>Vertical %<input data-exact="v" type="number" min="0" max="100" step="0.5" value="${(tattoo.v*100).toFixed(1)}"></label><label>Rotation °<input data-exact="rotation" type="number" min="-180" max="180" step="1" value="${Math.round(tattoo.rotation||0)}"></label><label>Grid<select id="v7Grid"><option value="1">1%</option><option value="2.5">2.5%</option><option value="5">5%</option></select></label></div><label class="v7-check"><input id="v7Snap" type="checkbox" ${ui.snap?'checked':''}> Snap placement and rotation</label><div class="btnrow"><button class="btn tiny" id="v7Center">Centre</button><button class="btn tiny" id="v7Mirror">Mirror duplicate</button><button class="btn tiny" id="v7Duplicate">Duplicate</button></div></details>
      <details><summary>Layers, group & mask</summary><div class="v7-exact-grid"><label>Group<input id="v7Group" value="${esc(tattoo.group||'')}" placeholder="e.g. sleeve"></label><label>Edge mask<select id="v7Mask"><option value="none">None</option><option value="ellipse">Soft ellipse</option><option value="fade">Vertical fade</option></select></label><label>Ink state<select id="v7Healing"><option value="healed">Healed</option><option value="fresh">Fresh</option><option value="aged">Aged</option><option value="faded">Faded</option></select></label></div><div class="btnrow"><button class="btn tiny" id="v7LayerUp">Layer up</button><button class="btn tiny" id="v7LayerDown">Layer down</button></div></details>`;
    host.append(block);$('v7Grid').value=String(ui.grid);$('v7Mask').value=tattoo.mask||'none';$('v7Healing').value=tattoo.healing||'healed';
    block.querySelectorAll('[data-exact]').forEach(input=>input.onchange=()=>{let value=Number(input.value);if(input.dataset.exact==='u'||input.dataset.exact==='v')value=clamp(value/100,0,1);else value=clamp(value,-180,180);tattoo[input.dataset.exact]=value;markDirty(tattoo.part);saveLayout(false);updateUI();});
    $('v7Grid').onchange=e=>{ui.grid=Number(e.target.value);saveUI();};$('v7Snap').onchange=e=>{ui.snap=e.target.checked;saveUI();};
    $('v7Center').onclick=()=>{tattoo.u=.5;tattoo.v=.5;markDirty(tattoo.part);saveLayout(false);updateUI();}; $('v7Duplicate').onclick=()=>duplicateTattoo(tattoo,false); $('v7Mirror').onclick=()=>duplicateTattoo(tattoo,true);
    $('v7Group').onchange=e=>{tattoo.group=e.target.value.trim();saveLayout(false);renderLayers();};
    $('v7Mask').onchange=e=>{tattoo.mask=e.target.value;bridge.decalMeshes.get(tattoo.id) && (bridge.decalMeshes.get(tattoo.id).textureSignature='');markDirty(tattoo.part);saveLayout(false);requestDraw();};
    $('v7Healing').onchange=e=>{tattoo.healing=e.target.value;bridge.decalMeshes.get(tattoo.id) && (bridge.decalMeshes.get(tattoo.id).textureSignature='');markDirty(tattoo.part);saveLayout(false);requestDraw();};
    $('v7LayerUp').onclick=()=>moveLayer(tattoo.id,1);$('v7LayerDown').onclick=()=>moveLayer(tattoo.id,-1);
  }
  function mirroredPart(part){if(part.startsWith('left_'))return part.replace('left_','right_');if(part.startsWith('right_'))return part.replace('right_','left_');return part;}
  function duplicateTattoo(source,mirror){const copy=Object.assign({},clone(source),{id:uid(),u:mirror?1-source.u:clamp(source.u+.04,0,1),part:mirror?mirroredPart(source.part):source.part,rotation:mirror?-(source.rotation||0):source.rotation,protected:false});tattoos.push(copy);selectedId=copy.id;markDirty(copy.part);saveLayout(false);updateUI();toast(mirror?'Mirrored duplicate created':'Tattoo duplicated');}
  function moveLayer(id,direction){const index=tattoos.findIndex(t=>t.id===id),next=clamp(index+direction,0,tattoos.length-1);if(index===next)return;const [tattoo]=tattoos.splice(index,1);tattoos.splice(next,0,tattoo);saveLayout(false);updateUI();}

  function installLayers(){const section=document.createElement('section');section.id='v7Layers';section.className='v7-section';document.querySelector('.sidebar.right').append(section);renderLayers();}
  function renderLayers(){const host=$('v7Layers');if(!host)return;const groups=[...new Set(tattoos.map(t=>t.group).filter(Boolean))];host.innerHTML=`<div class="panel-head"><div class="section-label">Layers & compositions</div><span class="pill">${tattoos.length}</span></div><div class="v7-layer-list">${tattoos.slice().reverse().map((tattoo,i)=>`<div class="v7-layer ${tattoo.id===selectedId?'active':''}"><button data-layer-select="${esc(tattoo.id)}"><i style="background:${esc(tattoo.color||'#25272b')}"></i><span>${esc(assetMap()[tattoo.asset]?.name||tattoo.asset)}<small>${esc(tattoo.group||nameOf(tattoo.part))}</small></span></button><button data-layer-eye="${esc(tattoo.id)}" title="Show or hide">${tattoo.hidden?'○':'●'}</button></div>`).join('')||'<div class="detailtxt">Placed tattoos will appear here as reorderable layers.</div>'}</div>${groups.length?`<div class="v7-group-nudge"><select id="v7NudgeGroup">${groups.map(g=>`<option>${esc(g)}</option>`).join('')}</select><span>Nudge group</span><button data-nudge="-1,0">←</button><button data-nudge="1,0">→</button><button data-nudge="0,-1">↑</button><button data-nudge="0,1">↓</button></div>`:''}`;host.querySelectorAll('[data-layer-select]').forEach(b=>b.onclick=()=>selectTattoo(b.dataset.layerSelect));host.querySelectorAll('[data-layer-eye]').forEach(b=>b.onclick=()=>{const t=tattoos.find(x=>x.id===b.dataset.layerEye);t.hidden=!t.hidden;saveLayout(false);renderLayers();requestDraw();});host.querySelectorAll('[data-nudge]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.nudge.split(',').map(Number),group=$('v7NudgeGroup').value,step=ui.grid/100;tattoos.filter(t=>t.group===group).forEach(t=>{t.u=clamp(t.u+x*step,0,1);t.v=clamp(t.v+y*step,0,1);markDirty(t.part);});saveLayout(false);updateUI();});}

  function exportStencil(){const tattoo=tattoos.find(t=>t.id===selectedId),asset=tattoo&&assetMap()[tattoo.asset];if(!tattoo||!asset){toast('Select a tattoo to export its stencil');return;}const width=Number(tattoo.width||tattoo.w||8).toFixed(1),height=Number(tattoo.height||tattoo.h||8).toFixed(1),html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(asset.name)} stencil</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:13px Arial;color:#111;margin:0}header{display:flex;justify-content:space-between;border-bottom:1px solid #999;padding-bottom:8px}.art{display:grid;place-items:center;min-height:220mm}.art img{width:${width}cm;height:${height}cm;object-fit:contain;filter:grayscale(1) contrast(1.35)}.scale{width:10cm;border-top:2px solid #000;display:flex;justify-content:space-between;margin-top:12px}.note{font-size:11px;color:#555}button{position:fixed;right:12px;top:12px}@media print{button{display:none}}</style></head><body><header><b>INK ATLAS · PLACEMENT STENCIL</b><span>${esc(ui.projectName)} · ${new Date().toLocaleDateString()}</span></header><div class="art"><div><img src="${asset.src}" alt=""><p>Target size: ${width} × ${height} cm · ${esc(nameOf(tattoo.part))}</p><div class="scale"><span>0</span><span>10 cm</span></div></div></div><p class="note">Print at 100% / Actual size. The 10 cm bar must measure exactly 10 cm. Curved-surface compensation is approximate; confirm placement and scale on the body with the tattoo artist.</p><button onclick="print()">Print / Save PDF</button></body></html>`;const win=window.open('','_blank');if(win){win.document.write(html);win.document.close();setTimeout(()=>win.print(),400);}else{const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));link.download='ink-atlas-stencil.html';link.click();URL.revokeObjectURL(link.href);toast('Stencil downloaded — open it to print');}}

  function snapSelected(){if(!ui.snap)return;const tattoo=tattoos.find(t=>t.id===selectedId);if(!tattoo)return;const step=ui.grid/100;tattoo.u=Math.round(tattoo.u/step)*step;tattoo.v=Math.round(tattoo.v/step)*step;tattoo.rotation=Math.round((tattoo.rotation||0)/5)*5;markDirty(tattoo.part);}
  function updateOnline(){const node=$('v7Online');if(node)node.textContent=navigator.onLine?'● Ready offline':'● Offline';}
  function installPWA(){window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;$('v7Install')?.classList.add('active');});window.addEventListener('online',updateOnline);window.addEventListener('offline',updateOnline);if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});}
  async function installApp(){if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;return;}toast(location.protocol==='file:'?'Open start.command first, then use Install in the local web app':'Use your browser menu · Install Ink Atlas / Add to Home Screen');}

  function installEvents(){document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}else if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='y'){event.preventDefault();redo();}});canvas.addEventListener('pointerup',()=>{if(ui.snap){snapSelected();saveLayout(false);updateUI();}});}

  const originalRenderInspector=renderInspector;
  renderInspector=function renderInspectorV7(){originalRenderInspector();enhanceInspector();renderAnalysis();renderLayers();updateIK();};

  toolbar(); installGuides(); installBodyLab(); installIK(); installAnalysis(); installLayers(); installEvents(); installPWA();
  if(!history.length)recordHistory('Opened project');else updateHistoryButtons();
  persistActiveProject(); updateUI();
})();
