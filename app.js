/* EVOLIFE local project page. All motion here is an illustration; recordings are replayed files. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = (v, digits = 1) => v == null ? '—' : Number(v).toFixed(digits);
  const localAsset = value => typeof value === 'string' && /^(assets|media)\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..') ? value : '';
  let paper, videos = [], caseStudies = [], activeCaseFilter = 'all', activeFilter = 'all', activeResult = 'benchmarks', mode = 'act';
  let manualModeUntil = 0, frameworkReady = false, artworkReady = false;
  const familyKey = {'vision-language-navigation':'vln', 'object-navigation':'object', 'interactive-instance-navigation':'interactive', 'continuous-multi-task-navigation':'continuous'};
  const familyName = {vln:'VISION–LANGUAGE', object:'OBJECT NAVIGATION', interactive:'INTERACTIVE INSTANCE', continuous:'CONTINUOUS MULTI-TASK'};
  const planned = {r2r:['176','559'],rxr:['86','17'],ovon:['62','51'],hm3dv2:['69','11'],vlln:['1','51'],coin:['74','45'],lhpr:['21','12'],goat:['41','7']};
  function displayInstruction(video) {
    const text = video.display_instruction || video.instruction || '';
    if (!text) return '';
    return ['ovon','hm3dv2'].includes(video.profile)
      ? text.replace(/\s+and approach\b[\s\S]*$/i,'').trim().replace(/[.!]?$/,'.')
      : text;
  }
  const capabilities = {
    act: {tool:'navigate_candidate', bubble:'A new place. A new possibility.', note:'Choose a useful way forward.', detail:'navigate_candidate / navigate_pixel / navigate_object / step', copy:'A movement intention can be expressed as a geometric candidate, a selected floor pixel, an object estimate, or a short discrete action. Actual observations and motion feedback inform the next decision.'},
    ask: {tool:'ask_human', bubble:'Which entrance leads to the goal?', note:'A question can change the route.', detail:'ask_human', copy:'The agent chooses the question and when to ask it. A guide answers using task and scene evidence in simulation; a nearby person can clarify a destination or help.'},
    remember: {tool:'remember_place', bubble:'Let’s keep this place for next time.', note:'This encounter stays with me.', detail:'remember_place / search_memory / inspect_place / navigate_place', copy:'Descriptions and dialogue are connected with actual poses, views, and map context. Historical images can be inspected when useful, and remembered places can become destinations on a later visit.'}
  };

  // Motion control also respects the user's OS preference.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, sceneVisible = true, time = 0, worldReady = false;
  const motionButton = $('#motion-toggle');
  function setPaused(value) {
    paused = value;
    document.body.classList.toggle('no-motion', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.title = paused ? 'Resume decorative motion' : 'Pause decorative motion';
    $('.motion-icon', motionButton).textContent = paused ? '▷' : 'Ⅱ';
    $('.sr-only', motionButton).textContent = motionButton.title;
    if (paused && worldReady) drawWorld(time);
    if (frameworkReady) refreshFramework();
    if (artworkReady) syncAnimatedArtworks();
  }
  motionButton.addEventListener('click', () => setPaused(!paused));
  reduced.addEventListener('change', event => setPaused(event.matches));
  setPaused(paused);

  const animatedArtworks = new Set();
  let teaserMarkupPromise, artworkInstance = 0;
  function syncAnimatedArtworks() {
    animatedArtworks.forEach(svg=>{
      if (!svg.isConnected) { animatedArtworks.delete(svg); return; }
      if (paused || document.hidden || svg.classList.contains('is-offscreen')) svg.pauseAnimations();
      else svg.unpauseAnimations();
    });
  }
  const artworkObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>entry.target.classList.toggle('is-offscreen',!entry.isIntersecting));
    syncAnimatedArtworks();
  },{threshold:.04});
  artworkObserver.observe($('.stats-ribbon'));
  function syncPageVisibility() {
    document.body.classList.toggle('page-inactive',document.hidden);
    syncAnimatedArtworks();
  }
  document.addEventListener('visibilitychange',syncPageVisibility);
  syncPageVisibility();
  artworkReady = true;
  async function animateTeaser(fallback, zoomable = false) {
    try {
      teaserMarkupPromise ||= fetch('assets/figures/teaser-animation/teaser-layered-cropped.svg').then(response=>{
        if (!response.ok) throw new Error('Teaser artwork unavailable');
        return response.text();
      });
      const markup = await teaserMarkupPromise;
      if (!fallback.isConnected) return;
      const parsed = new DOMParser().parseFromString(markup,'image/svg+xml');
      if (parsed.querySelector('parsererror')) throw new Error('Invalid teaser artwork');
      const svg = document.importNode(parsed.documentElement,true);
      const prefix = `teaser-${++artworkInstance}-`, ids = new Map();
      $$('[id]',svg).forEach(element=>{const id=element.id;ids.set(id,prefix+id);element.id=prefix+id;});
      [svg,...$$('*',svg)].forEach(element=>{
        [...element.attributes].forEach(attribute=>{
          let value=attribute.value.replace(/url\(["']?#([^\s)'"#]+)["']?\)/g,(match,id)=>ids.has(id)?`url(#${ids.get(id)})`:match);
          if(value.startsWith('#') && ids.has(value.slice(1))) value='#'+ids.get(value.slice(1));
          if(value!==attribute.value)element.setAttributeNS(attribute.namespaceURI,attribute.name,value);
        });
      });
      svg.classList.add('animated-teaser','is-offscreen');
      $$('[data-motion]',svg).forEach(layer=>{
        const [cx,cy]=layer.dataset.center.split(' ').map(Number);
        layer.style.removeProperty('transform-origin');
        layer.style.removeProperty('transform-box');
        const spin=document.createElementNS('http://www.w3.org/2000/svg','animateTransform');
        spin.setAttribute('attributeName','transform');spin.setAttribute('type','rotate');
        spin.setAttribute('from',`0 ${cx} ${cy}`);
        spin.setAttribute('to',`${layer.dataset.motion==='ring'?360:-360} ${cx} ${cy}`);
        spin.setAttribute('dur',layer.dataset.motion==='ring'?'40s':'24s');
        spin.setAttribute('repeatCount','indefinite');
        layer.append(spin);
      });
      if (zoomable) svg.addEventListener('click',()=>svg.classList.toggle('zoomed'));
      fallback.replaceWith(svg);
      animatedArtworks.add(svg);syncAnimatedArtworks();artworkObserver.observe(svg);
    } catch(error) {
      // The original paper figure remains available if SVG loading fails.
      console.warn('Animated teaser could not load; using the original figure.',error);
    }
  }
  animateTeaser($('.teaser-figure img'));

  function chooseMode(next, manual = false) {
    if (manual) manualModeUntil = Date.now() + 22000;
    mode = next;
    const content = capabilities[mode];
    $('#hero-tool').textContent = content.tool;
    $('#robot-bubble').textContent = content.bubble;
    $('#memory-note').textContent = content.note;
    $('#detail-tool').textContent = content.detail;
    $('#detail-copy').textContent = content.copy;
    $$('[data-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });
    $$('[data-capability]').forEach(button => {
      button.classList.toggle('active', button.dataset.capability === mode);
      button.setAttribute('aria-pressed', String(button.dataset.capability === mode));
    });
    if (paused) drawWorld(time);
  }
  $$('[data-mode]').forEach(button => button.addEventListener('click', () => chooseMode(button.dataset.mode, true)));
  $$('[data-capability]').forEach(button => button.addEventListener('click', () => chooseMode(button.dataset.capability, true)));

  // Each complete framework panel remains one interactive visual layer.
  const frameworkBoard = $('.framework-board');
  const frameworkParts = $$('[data-framework]');
  const frameworkCycle = ['navigate','interact','evolve'];
  const frameworkNames = {
    navigate:'NAVIGATE · HYBRID ACTION SPACE',
    interact:'INTERACT · ACTIVE INTERACTION',
    evolve:'EVOLVE · PERSISTENT MEMORY',
    core:'EVOLIFE · DECISION LOOP & HISTORY'
  };
  let frameworkSelected = null, frameworkHovered = null;
  let frameworkIndex = 0, frameworkVisible = false;
  function refreshFramework() {
    const key = frameworkSelected || frameworkHovered || (!paused && frameworkVisible ? frameworkCycle[frameworkIndex] : null);
    frameworkParts.forEach(part=>{
      const active = part.dataset.framework===key;
      part.classList.toggle('is-selected',part.dataset.framework===frameworkSelected);
      part.classList.toggle('is-hovered',!frameworkSelected && part.dataset.framework===frameworkHovered);
      part.classList.toggle('is-auto-active',active && !frameworkSelected && !frameworkHovered && !paused);
      part.setAttribute('aria-pressed',String(part.dataset.framework===frameworkSelected));
    });
    $('#framework-state').textContent=key?frameworkNames[key]:'NAVIGATE · INTERACT · EVOLVE';
    $('#framework-state').dataset.tone=key || 'rest';
    $('#framework-hint').textContent=frameworkSelected?'Module selected · Select again or choose Auto cycle to resume.':'Select a module to lift it. Select it again to resume the cycle.';
    $('#framework-auto').classList.toggle('active',!frameworkSelected && !frameworkHovered);
  }
  function resetFramework() {
    frameworkSelected=null;frameworkHovered=null;frameworkIndex=0;refreshFramework();
  }
  frameworkParts.forEach(part=>{
    part.addEventListener('pointerenter',()=>{if(!frameworkSelected){frameworkHovered=part.dataset.framework;refreshFramework();}});
    part.addEventListener('pointerleave',()=>{frameworkHovered=null;refreshFramework();});
    part.addEventListener('click',()=>{
      const key=part.dataset.framework;
      frameworkSelected=frameworkSelected===key?null:key;
      frameworkHovered=null;
      if(!frameworkSelected)frameworkIndex=0;
      refreshFramework();
    });
  });
  $('#framework-auto').addEventListener('click',resetFramework);
  frameworkBoard.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();resetFramework();}});
  new IntersectionObserver(entries=>{
    frameworkVisible=entries[0].isIntersecting;
    frameworkBoard.classList.toggle('is-offscreen',!frameworkVisible);
    if(frameworkVisible && !frameworkSelected)frameworkIndex=0;
    refreshFramework();
  },{threshold:.1}).observe(frameworkBoard);
  setInterval(()=>{
    if(paused || document.hidden || !frameworkVisible || frameworkSelected || frameworkHovered)return;
    frameworkIndex=(frameworkIndex+1)%frameworkCycle.length;
    refreshFramework();
  },3200);
  frameworkReady=true;
  refreshFramework();

  const robot = $('#robot'), playground = $('#playground');
  let helloTimer;
  robot.addEventListener('click', () => {
    clearTimeout(helloTimer);
    robot.classList.remove('hello');
    void robot.offsetWidth;
    robot.classList.add('hello');
    $('#robot-bubble').textContent = 'Hello, explorer. Where shall we go?';
    helloTimer = setTimeout(() => {
      robot.classList.remove('hello');
      $('#robot-bubble').textContent = capabilities[mode].bubble;
    }, 2700);
  });
  playground.addEventListener('pointermove', event => {
    if (paused || event.pointerType === 'touch') return;
    const bounds = playground.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    robot.style.setProperty('--eye-x', `${Math.round(x * 9)}px`);
    robot.style.setProperty('--eye-y', `${Math.round(y * 7)}px`);
  });
  playground.addEventListener('pointerleave', () => {
    robot.style.setProperty('--eye-x', '0px');
    robot.style.setProperty('--eye-y', '0px');
  });

  const toolScenes = {
    act: [
      {tool:'navigate_candidate', bubble:'An open route. Let’s take a closer look.'},
      {tool:'navigate_pixel', bubble:'That patch of floor looks promising.'},
      {tool:'navigate_object', bubble:'I see it. Let’s move a little closer.'},
      {tool:'step', bubble:'A small turn can reveal a new way.'}
    ],
    ask: [
      {tool:'ask_human', bubble:'Which entrance leads to the goal?'},
      {tool:'ask_human', bubble:'Could someone help with this door?'},
      {tool:'ask_human', bubble:'A little clarification goes a long way.'}
    ],
    remember: [
      {tool:'remember_place', bubble:'Let’s keep this place for next time.'},
      {tool:'search_memory', bubble:'Have I encountered a place like this?'},
      {tool:'inspect_place', bubble:'Let’s look at that earlier view.'},
      {tool:'navigate_place', bubble:'A familiar place. A useful memory.'},
      {tool:'observe_map', bubble:'Every encounter adds a little context.'}
    ]
  };
  const idlePoses = ['idle-scan','idle-nod','idle-wave','idle-hop','idle-think','idle-happy'];
  let idleTimer, lastPose = '', sceneBeat = 0;
  function idleGesture() {
    if (paused || robot.classList.contains('hello')) return;
    clearTimeout(idleTimer);
    robot.classList.remove(...idlePoses);
    const choices=idlePoses.filter(p=>p!==lastPose);
    lastPose=choices[Math.floor(Math.random()*choices.length)];
    robot.classList.add(lastPose);
    idleTimer=setTimeout(()=>robot.classList.remove(...idlePoses),2700);
  }
  function cycleTool() {
    const current=$('#hero-tool').textContent;
    const alternatives=toolScenes[mode].filter(item=>item.tool!==current);
    const pool=alternatives.length?alternatives:toolScenes[mode];
    const item=pool[Math.floor(Math.random()*pool.length)];
    $('#hero-tool').textContent=item.tool;
    if(!robot.classList.contains('hello'))$('#robot-bubble').textContent=item.bubble;
    $('.floating-tool').classList.remove('tool-changed');
    void $('.floating-tool').offsetWidth;
    $('.floating-tool').classList.add('tool-changed');
  }
  setInterval(()=>{
    if(paused || document.hidden || !sceneVisible || robot.classList.contains('hello')) return;
    sceneBeat++;
    if(sceneBeat%2===0 && Date.now()>manualModeUntil){
      const options=Object.keys(capabilities).filter(key=>key!==mode);
      chooseMode(options[Math.floor(Math.random()*options.length)]);
    } else cycleTool();
    idleGesture();
  },4700);

  // A low-resolution, layered map of an imagined world, drawn without external assets.
  const canvas = $('#world-canvas'), context = canvas.getContext('2d');
  let cw = 0, ch = 0;
  function resizeWorld() {
    cw = Math.round(playground.clientWidth / 2);
    ch = Math.round(playground.clientHeight / 2);
    canvas.width = cw; canvas.height = ch;
    drawWorld(time);
  }
  const map = [
    '0000000000000000000000000',
    '0000111111000001111100000',
    '0000100001000001000100000',
    '0000100001111111000100000',
    '0000100000000000000100000',
    '0000111000000000111100000',
    '0000001000000000100000000',
    '0000001000000000111110000',
    '0000001000000000000010000',
    '0000001111111111111110000',
    '0000000000000000000000000'
  ];
  function drawWorld(t) {
    if (!cw || !ch) return;
    const ctx = context;
    ctx.clearRect(0,0,cw,ch);
    const unit = Math.max(5, Math.floor(cw / 29)), ox = (cw - 25 * unit) / 2, oy = ch * .56;
    ctx.save();
    // Distant pixel lights.
    for (let i = 0; i < 34; i++) {
      const x = (i * 47 + 17) % cw, y = (i * 31 + 35) % (ch * .7);
      const alpha = .06 + .12 * (.5 + Math.sin(t / 1800 + i) / 2);
      ctx.fillStyle = `rgba(185,224,170,${alpha})`;
      ctx.fillRect(Math.floor(x),Math.floor(y),i % 5 ? 1 : 2,i % 5 ? 1 : 2);
    }
    // The floor recedes behind the robot.
    const iso = (x,y,z=0) => [ox + x*unit + y*unit*.28, oy + y*unit*.51 - z];
    for (let y=0;y<map.length;y++) for (let x=0;x<map[y].length;x++) {
      if (x < 3 || x > 22 || y < 1 || y > 9) continue;
      const [px,py] = iso(x,y);
      ctx.fillStyle = (x+y)%2 ? '#1b332a' : '#1a302a';
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+unit,py);ctx.lineTo(px+unit*1.28,py+unit*.51);ctx.lineTo(px+unit*.28,py+unit*.51);ctx.closePath();ctx.fill();
      if (map[y][x] === '1') {
        const lift = unit * .55;
        ctx.fillStyle='#2c4c38';ctx.fillRect(Math.round(px),Math.round(py-lift),unit,Math.ceil(lift));
        ctx.fillStyle='#466547';ctx.fillRect(Math.round(px),Math.round(py-lift),unit,2);
        ctx.fillStyle='#233f30';ctx.fillRect(Math.round(px+unit),Math.round(py-lift+2),2,Math.ceil(lift-1));
      }
    }
    const path = [[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],[14,4],[15,4],[16,4],[17,4],[18,4],[18,5],[18,6],[18,7],[17,7],[16,7]];
    const progress = (t / 950) % path.length;
    path.forEach(([x,y],i) => {
      const [px,py]=iso(x+.35,y+.6);
      ctx.fillStyle = mode==='ask' ? '#bd986580' : mode==='remember' ? '#8bc6b080' : '#a0c87d80';
      ctx.globalAlpha = i < progress ? .8 : .18;
      ctx.fillRect(Math.round(px),Math.round(py),3,2);
    });
    ctx.globalAlpha=1;
    const nodes = [[5,4],[11,4],[18,7]];
    nodes.forEach(([x,y],i) => {
      const [px,py]=iso(x+.4,y+.5);
      const pulse=1+Math.floor((Math.sin(t/800+i*2)+1)*1.5);
      ctx.fillStyle=mode==='remember'?'#bdedac':'#88ac7a';
      ctx.fillRect(Math.round(px-2),Math.round(py-3),5,4);
      ctx.strokeStyle='#a4ce8a40';ctx.lineWidth=1;
      ctx.strokeRect(Math.round(px-3-pulse),Math.round(py-4-pulse),7+pulse*2,6+pulse*2);
    });
    ctx.restore();
  }
  worldReady = true;
  new ResizeObserver(resizeWorld).observe(playground);
  new IntersectionObserver(entries => {sceneVisible = entries[0].isIntersecting;}, {rootMargin:'60px'}).observe(playground);
  let lastFrame = 0;
  function tick(now) {
    if (!paused && !document.hidden && sceneVisible && now-lastFrame > 50) {
      time += Math.min(now-lastFrame || 50, 100);
      drawWorld(time); lastFrame=now;
    } else if (paused || !sceneVisible || document.hidden) lastFrame=now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Media dialog: nothing is uploaded and no live model is called by this page.
  const dialog = $('#media-dialog'), dialogContent = $('#dialog-content');
  let previousFocus;
  function openDialog(title, kicker) {
    if (!dialog.open) previousFocus = document.activeElement;
    $('#dialog-title').textContent = title;
    $('#dialog-kicker').textContent = kicker;
    dialogContent.replaceChildren();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  }
  function cleanupDialog() {
    $$('video',dialogContent).forEach(video => {video.pause(); video.removeAttribute('src'); video.load();});
    $$('svg.animated-teaser',dialogContent).forEach(svg=>{artworkObserver.unobserve(svg);animatedArtworks.delete(svg);});
    dialogContent.replaceChildren();
    document.body.classList.remove('modal-open');
    previousFocus?.focus();
  }
  $('#close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close', cleanupDialog);
  dialog.addEventListener('click',event=>{
    const bounds=dialog.getBoundingClientRect();
    if (event.target===dialog && (event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom)) dialog.close();
  });
  function openFigure(id) {
    const figure = paper?.figures.find(f=>f.id===id);
    if (!figure) return;
    openDialog(figure.title, 'FROM THE PAPER · CLICK IMAGE TO ZOOM');
    const image = document.createElement('img');
    image.src=localAsset(figure.full || figure.src); image.alt=figure.caption;
    image.addEventListener('click',()=>image.classList.toggle('zoomed'));
    dialogContent.append(image);
    if(id==='teaser')animateTeaser(image,true);
    const caption=document.createElement('p');caption.className='video-modal-info';caption.textContent=figure.caption;dialogContent.append(caption);
  }
  $$('[data-figure]').forEach(button=>button.addEventListener('click',()=>openFigure(button.dataset.figure)));

  function caseFamily(item) {
    const benchmark = paper?.benchmarks.find(b=>b.id===item.id.split('_')[0]);
    return familyKey[benchmark?.family] || 'vln';
  }
  function openCase(id) {
    const index=caseStudies.findIndex(item=>item.id===id), item=caseStudies[index];
    if(!item)return;
    openDialog(`${item.benchmark} · ${item.title}`, 'A CLOSER LOOK · RECORDED DECISIONS');
    const image=document.createElement('img');
    image.src=localAsset(item.full || item.src);image.alt=item.summary;
    image.width=item.width;image.height=item.height;image.className='case-full-image';
    image.addEventListener('click',()=>image.classList.toggle('zoomed'));
    dialogContent.append(image);
    const body=document.createElement('div');body.className='case-reading';
    const task=document.createElement('section');task.className='case-task';
    const label=document.createElement('span');label.className='tiny-label';label.textContent=item.subtasks>1?'THE CONTINUOUS TASK':'THE TASK';
    const instruction=document.createElement('p');instruction.textContent=item.task;
    task.append(label,instruction);body.append(task);
    if(item.subtask_goals?.length){
      const goals=document.createElement('details');goals.className='case-goals';
      const summary=document.createElement('summary');summary.textContent=`View all ${item.subtasks} goals`;
      goals.append(summary);
      const list=document.createElement('ol');
      item.subtask_goals.forEach(goal=>{
        const li=document.createElement('li');
        li.textContent=typeof goal==='string'?goal:goal.instruction || goal.text || goal.task || `Subtask ${(goal.subtask_index??list.children.length)+1}`;
        list.append(li);
      });goals.append(list);body.append(goals);
    }
    const tags=document.createElement('div');tags.className='case-tools';
    item.tools.forEach(tool=>{const tag=document.createElement('code');tag.textContent=tool;tags.append(tag);});
    body.append(tags);
    const heading=document.createElement('h3');heading.textContent='From evidence to the next move.';
    const caption=document.createElement('p');caption.className='case-caption';caption.textContent=item.summary;
    const analysis=document.createElement('p');analysis.className='case-analysis';analysis.textContent=item.analysis;
    body.append(heading,caption,analysis);
    const controls=document.createElement('div');controls.className='case-modal-controls';
    const video=videos.find(record=>record.id===item.video_id);
    if(video?.status==='ready'){
      const watch=document.createElement('button');watch.className='case-watch';watch.textContent='▶ Watch the recorded run';
      watch.addEventListener('click',()=>playVideo(video));controls.append(watch);
    }
    const browse=document.createElement('div');browse.className='case-next-prev';
    for(const [offset,text] of [[-1,'← Previous case'],[1,'Next case →']]){
      const button=document.createElement('button');button.textContent=text;
      button.addEventListener('click',()=>{openCase(caseStudies[(index+offset+caseStudies.length)%caseStudies.length].id);dialogContent.scrollTop=0;});
      browse.append(button);
    }
    controls.append(browse);body.append(controls);dialogContent.append(body);
  }
  function renderCases() {
    const shown=caseStudies.filter(item=>activeCaseFilter==='all' || caseFamily(item)===activeCaseFilter);
    $('#case-count').textContent=`${shown.length} ${shown.length===1?'case':'cases'} · ${activeCaseFilter==='all'?'one from each benchmark':familyName[activeCaseFilter].toLowerCase()}`;
    $('#case-grid').innerHTML=shown.map(item=>{
      const tools=item.tools.slice(0,3).map(tool=>`<code>${escape(tool)}</code>`).join('');
      const short=item.summary.split(/(?<=[.!?])\s+/).slice(0,2).join(' ');
      return `<article class="case-card"><button class="case-open" data-case-id="${escape(item.id)}" aria-label="Explore ${escape(item.benchmark)}: ${escape(item.title)}"><div class="case-card-heading"><span>${escape(item.benchmark)}</span><small>${item.subtasks>1?`${item.subtasks} continuous subtasks`:`Episode ${escape(item.episode_id)}`}</small></div><div class="case-artwork"><img src="${escape(localAsset(item.src))}" width="${item.preview_width}" height="${item.preview_height}" alt="${escape(item.summary)}" loading="lazy"><span class="case-enlarge" aria-hidden="true">↗</span></div><div class="case-card-copy"><h4>${escape(item.title)}</h4><p>${escape(short)}</p><div class="case-tools">${tools}</div><span class="case-read">Explore the decisions <b>↗</b></span></div></button></article>`;
    }).join('');
    $$('[data-case-id]').forEach(button=>button.addEventListener('click',()=>openCase(button.dataset.caseId)));
  }
  async function loadCases() {
    const response=await fetch('data/cases.json');
    if(!response.ok)throw new Error('Case studies unavailable');
    const data=await response.json();caseStudies=data.cases;renderCases();
  }
  $$('[data-case-filter]').forEach(button=>button.addEventListener('click',()=>{
    activeCaseFilter=button.dataset.caseFilter;
    $$('[data-case-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    renderCases();
  }));

  function playVideo(video) {
    const src=localAsset(video.src || video.video);
    const ready=src && video.status==='ready' && Number(video.success)===1;
    openDialog(`${video.benchmark} · ${video.subtasks>1?'Sequence':'Episode'} ${video.episode_id}`,'RECORDED NAVIGATION');
    if (!ready) {
      const status={planned:'Queued for recording',running:'Navigation in progress',evaluated:'Navigation complete · preparing replay',rendering:'Rendering the replay',failed:'Run needs review',error:'Run needs review',withheld:'Re-recording after a guide transport error',infra_retry_pending:'Waiting for the guide transport to recover',verifying:'Checking the recording'}[video.status] || 'Preparing the replay';
      dialogContent.innerHTML=`<div class="pending-message"><strong>${escape(status)}</strong><p>${escape(displayInstruction(video) || 'This selected example is being recorded with the current tools. The replay will appear here when it has been checked.')}</p><p>${video.success===false?'This new run did not meet the success criterion. Its original record is preserved for review. Only verified successful replays are included in the showcase.':'The original run succeeded. The new recording is verified independently before it is presented as a successful demo.'}</p></div>`;
      return;
    }
    const player=document.createElement('video');
    player.controls=true; player.playsInline=true; player.preload='metadata'; player.src=src;
    if (localAsset(video.poster)) player.poster=localAsset(video.poster);
    dialogContent.append(player);
    player.play().catch(()=>{});
  }

  function episodeStatus(video) {
    if(video?.status==='ready' && Number(video.success)===1) return ['ready','Play'];
    if(video?.status==='running') return ['running','Recording'];
    if(['rendering','evaluated'].includes(video?.status)) return ['running','Rendering'];
    if(['withheld','infra_retry_pending','infra_pending','recovering'].includes(video?.status)) return ['','Re-recording'];
    if(video?.status==='verifying') return ['','Checking'];
    if(['failed','error'].includes(video?.status)) return ['','In review'];
    return ['','Queued'];
  }
  function renderDemos() {
    if (!paper) return;
    const grid=$('#benchmark-grid');
    const oldFocus=document.activeElement?.dataset?.episode;
    grid.innerHTML=paper.benchmarks.filter(b=>activeFilter==='all'||familyKey[b.family]===activeFilter).map(benchmark=>{
      const items=planned[benchmark.id].map(id=>videos.find(v=>v.profile===benchmark.id && String(v.episode_id)===id) || {id:`${benchmark.id}_${id}`,profile:benchmark.id,benchmark:benchmark.name,episode_id:id,status:'planned'});
      const ready=items.find(v=>v.status==='ready' && Number(v.success)===1);
      const metric=benchmark.metrics.sr ?? benchmark.metrics.episode_sr;
      return `<article class="benchmark-card" data-benchmark="${benchmark.id}"><button class="benchmark-cover" data-episode="${escape((ready||items[0]).id)}" aria-label="Open ${escape(benchmark.name)} demo"><img src="${escape(benchmark.thumbnail)}" alt="${escape(benchmark.name)} navigation scene" loading="lazy"><span class="family-label">${familyName[familyKey[benchmark.family]]}</span><span class="mini-play">${ready?'▶':'↗'}</span></button><div class="benchmark-info"><header><h3>${escape(benchmark.name)}</h3><span class="benchmark-sr">${number(metric,0)}% ${benchmark.id==='goat'?'e-SR':'SR'}</span></header><p>${benchmark.episodes} ${benchmark.subtasks>benchmark.episodes?'sequences · '+benchmark.subtasks+' subtasks':'episodes'}</p><div class="episode-buttons">${items.map(video=>{
        const [css,label]=episodeStatus(video);
        return `<button class="episode-button ${css}" data-episode="${escape(video.id)}" aria-label="${escape(benchmark.name)} ${video.episode_id}: ${label}">${escape(video.episode_id)} <span>${label}</span></button>`;
      }).join('')}</div></div></article>`;
    }).join('');
    $$('[data-episode]',grid).forEach(button=>button.addEventListener('click',()=>{
      let video=videos.find(v=>v.id===button.dataset.episode);
      if(!video){const [profile,episode_id]=button.dataset.episode.split('_');video={benchmark:paper.benchmarks.find(b=>b.id===profile)?.name,profile,episode_id,status:'planned'};}
      playVideo(video);
    }));
    if(oldFocus) $(`[data-episode="${oldFocus}"]`,grid)?.focus({preventScroll:true});
  }
  $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.filter;
    $$('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    renderDemos();
  }));
  let lastVideoState='';
  const guideChecks = new Map();
  async function checkGuideTransport(video) {
    if(video.status!=='ready')return;
    const key=String(video.src)+'|'+String(video.sha256);
    let valid=guideChecks.get(key);
    if(valid===undefined){
      try {
        const prefix=video.src.slice(0,video.src.lastIndexOf('/'));
        const response=await fetch(localAsset(video.interactions_src || prefix+'/interactions.json'));
        if(!response.ok){video.status='verifying';return;}
        const entries=await response.json();
        valid=Array.isArray(entries)&&!entries.some(item=>item.failed===true||/^No reliable answer was received\./i.test(String(item.human_reply??item.answer??'').trim()));
        guideChecks.set(key,valid);
      } catch(error){video.status='verifying';return;}
    }
    if(!valid)video.status='withheld';
  }
  async function refreshVideos() {
    try {
      const response=await fetch('media/status.json',{cache:'no-store'});
      if(!response.ok) return;
      const status=await response.json();
      videos=(status.videos || []).filter(video=>planned[video.profile]?.includes(String(video.episode_id)));
      await Promise.all(videos.map(checkGuideTransport));
      const ready=videos.filter(v=>v.status==='ready'&&Number(v.success)===1).length;
      const running=videos.filter(v=>v.status==='running').length;
      const rendering=videos.filter(v=>['evaluated','rendering'].includes(v.status)).length;
      const review=videos.filter(v=>['failed','error'].includes(v.status)).length;
      const retry=videos.filter(v=>['withheld','infra_retry_pending','infra_pending','recovering'].includes(v.status)).length;
      $('#video-progress').innerHTML=`<i></i>${ready} / ${status.planned||16} replays ready${running?' · '+running+' recording':''}${rendering?' · '+rendering+' rendering':''}${review?' · '+review+' in review':''}${retry?' · '+retry+' re-recording':''}`;
      const state=JSON.stringify(videos);
      if(state!==lastVideoState){renderDemos();lastVideoState=state;}
    } catch(error) {
      $('#video-progress').textContent='Recording status temporarily unavailable';
    }
  }

  let doorState='closed',doorVisible=false;
  function showDoor(state) {
    doorState=state;
    $('#door-image').src=state==='open'?'assets/physical/b_open.webp':'assets/physical/b_closed.webp';
    $('#door-image').alt=state==='open'?'The door opened after human assistance':'The closed door on the return to room 625';
    $$('[data-door]').forEach(button=>{
      const active=button.dataset.door===state;
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
  }
  $$('[data-door]').forEach(button=>button.addEventListener('click',()=>showDoor(button.dataset.door)));
  new IntersectionObserver(entries=>{doorVisible=entries[0].isIntersecting;},{threshold:.2}).observe($('.door-comparison'));
  setInterval(()=>{if(!paused&&!document.hidden&&doorVisible)showDoor(doorState==='closed'?'open':'closed');},5000);

  async function loadComparisons() {
    const response=await fetch('data/comparisons.json');
    if(!response.ok)throw new Error('Comparison tables unavailable');
    const data=await response.json();
    const titles=['Vision–language & object navigation','Interactive & continuous navigation'];
    $('#sota-tables').innerHTML=data.tables.map((comparison,index)=>{
      const starts=[];let offset=0;
      comparison.groups.forEach(group=>{starts.push(offset);offset+=group.metrics.length;});
      return `<article class="comparison-block"><div class="comparison-title"><div><span>COMPARISON 0${index+1}</span><h4>${titles[index]}</h4></div><button class="expand-comparison" data-comparison="${comparison.id}" aria-expanded="false">Expand full table <span>↗</span></button></div><div class="comparison-scroll" id="comparison-${comparison.id}" tabindex="0" role="region" aria-label="${titles[index]} comparison table, scroll to see all methods"><table class="sota-table"><thead><tr><th rowspan="2" scope="col" class="method-col">Method</th>${comparison.groups.map(group=>`<th colspan="${group.metrics.length}" scope="colgroup">${escape(group.name)}</th>`).join('')}</tr><tr>${comparison.groups.map(group=>group.metrics.map((metric,i)=>`<th scope="col" class="${i===0?'group-start':''}">${escape(metric)}</th>`).join('')).join('')}</tr></thead><tbody>${comparison.rows.map(row=>`<tr class="${row.ours?'ours-row':''}"><th scope="row" class="method-col">${row.ours?'<span class="ours-tag">OUR HARNESS</span>':''}${!row.ours&&row.url&&/^https:\/\//.test(row.url)?`<a href="${escape(row.url)}" target="_blank" rel="noopener">${escape(row.method)} <span>↗</span></a>`:escape(row.method)}</th>${row.values.map((value,i)=>`<td class="${starts.includes(i)?'group-start ':''}${value==='--'?'unreported':''}">${value==='--'?'—':escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="comparison-foot"><span>${comparison.rows.length-1} reference methods + EVOLIFE</span><p>NE in metres; NQ is the mean number of agent-initiated question–answer exchanges per episode. Other metrics in %. — indicates an unreported result. Reference values retain their source evaluation settings.</p><span class="scroll-hint">SCROLL TO EXPLORE ↓</span></div></article>`;
    }).join('');
    $$('.expand-comparison').forEach(button=>button.addEventListener('click',()=>{
      const container=$('#comparison-'+button.dataset.comparison);
      const expanded=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(expanded));
      container.classList.toggle('expanded',expanded);
      button.innerHTML=expanded?'Compact table <span>↙</span>':'Expand full table <span>↗</span>';
    }));
  }

  function table(headers,rows) {
    return `<table class="results-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }
  function renderResults() {
    if (!paper) return;
    const panel=$('#results-content');panel.setAttribute('aria-labelledby',`tab-${activeResult}`);
    if(activeResult==='benchmarks'){
      const labels={sr:'SR',spl:'SPL',ne:'NE',osr:'OSR',ndtw:'nDTW',isr:'ISR',csr:'CSR',cgt:'CGT',nq:'NQ',episode_sr:'e-SR',subtask_sr:'s-SR'};
      panel.innerHTML=table(['Benchmark','Evaluation units','SR / e-SR (%) ↑','SPL (%) ↑','Additional benchmark metrics'],paper.benchmarks.map(b=>{
        const m=b.metrics,extra=Object.entries(m).filter(([key])=>!['sr','episode_sr','spl'].includes(key)).map(([key,val])=>`${labels[key]} ${number(val,key==='ne'||key==='nq'?2:1)}${key==='ne'?' m':key==='nq'?'':'%'}`).join(' · ');
        return `<tr><td>${escape(b.name)}<span class="table-family">${escape(familyName[familyKey[b.family]])}</span></td><td>${b.episodes} ${b.subtasks>b.episodes?'sequences / '+b.subtasks+' subtasks':'episodes'}</td><td class="best">${number(m.sr??m.episode_sr)}</td><td>${number(m.spl)}</td><td>${escape(extra)}</td></tr>`;
      }));
      $('#results-caption').textContent='Reported manuscript results. Continuous tasks use complete-sequence SR (GOAT: e-SR); benchmark-specific metrics are retained. GOAT SPL is 81.9 under the main table’s equal-sequence averaging.';
    } else if(activeResult==='memory'){
      panel.innerHTML=table(['R2R-CE backbone','Interaction','Memory','SR (%) ↑','SPL (%) ↑','Steps','ND','NQ','Time (s)','Cost ($/ep.)'],paper.ablations.map(b=>`<tr class="${b.initial_memory?'highlight':''}"><td>${escape(b.model)}</td><td>${b.interaction?'✓':'×'}</td><td>${b.initial_memory?'✓':'×'}</td><td>${number(b.metrics.sr)}</td><td class="${b.initial_memory?'best':''}">${number(b.metrics.spl)}</td><td>${number(b.metrics.steps,2)}</td><td>${number(b.metrics.decisions,2)}</td><td>${number(b.interactions,2)}</td><td>${number(b.time_s,2)}</td><td>${number(b.cost_usd,2)}</td></tr>`));
      $('#results-caption').textContent='Interaction: ✓ enabled, × disabled. Memory: × first visit in an unseen environment; ✓ revisit with memory retained from the first visit. Memory accumulated during the current run remains available in both settings. ND is the mean number of completed tool-level decisions; NQ is the mean number of active interaction exchanges. Steps, time and cost are averaged per episode. Time and cost exclude the guide; cost is averaged over trajectories with complete usage records.';
    } else {
      panel.innerHTML=table(['R2R-CE backbone','OSR (%) ↑','SR (%) ↑','SPL (%) ↑','NE (m) ↓','Steps','ND','NQ','Time (s)','Cost ($/ep.)'],paper.backbone.map(b=>{
        const m=b.metrics;return `<tr><td>${escape(b.model)}</td>${['osr','sr','spl','ne','steps','decisions','interactions','time_s','cost_usd'].map(k=>`<td>${number(m[k],['osr','sr','spl'].includes(k)?1:2)}</td>`).join('')}</tr>`;
      }));
      $('#results-caption').textContent='The navigation harness is evaluated with three decision backbones. ND is the mean number of completed tool-level decisions; NQ is the mean number of active interaction exchanges. Time and cost exclude the guide; cost uses complete-usage trajectory means.';
    }
  }
  $$('[data-result]').forEach(button=>{
    button.addEventListener('click',()=>{
      activeResult=button.dataset.result;
      $$('[data-result]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));
      renderResults();
    });
    button.addEventListener('keydown',event=>{
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
      const buttons=$$('[data-result]'),i=buttons.indexOf(button);
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
      event.preventDefault();buttons[next].focus();buttons[next].click();
    });
  });

  $('#copy-citation').addEventListener('click',async()=>{
    try{
      const text=$('#citation-text').textContent;
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{const textarea=document.createElement('textarea');textarea.value=text;document.body.append(textarea);textarea.select();document.execCommand('copy');textarea.remove();}
      $('#copy-status').textContent='Citation copied.';
    }catch(error){$('#copy-status').textContent='Select the text above to copy the citation.';}
  });
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('shown');revealObserver.unobserve(entry.target);}}),{threshold:.06});
  $$('.reveal').forEach(element=>revealObserver.observe(element));
  const nav=$('.nav'),backTop=$('.back-top'),progress=$('.page-progress i');
  let scrollPending=false;
  function updateScroll(){
    const y=window.scrollY,max=document.documentElement.scrollHeight-window.innerHeight;
    nav.classList.toggle('scrolled',y>120);
    backTop.classList.toggle('visible',y>700);
    progress.style.width=`${max>0?y/max*100:0}%`;
    const current=['agent','demos','world','results','cases'].findLast(id=>$('#'+id).getBoundingClientRect().top<180);
    $$('.nav-links a').forEach(link=>link.classList.toggle('active',link.hash==='#'+current));
    scrollPending=false;
  }
  window.addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(updateScroll);}},{passive:true});
  backTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:paused?'instant':'smooth'}));
  updateScroll();
  async function init(){
    try{
      const response=await fetch('data/paper.json');
      if(!response.ok)throw new Error('Content unavailable');
      paper=await response.json();
      $('#abstract-text').textContent=paper.abstract;
      if(paper.authors?.length){
        const authors=$('#authors');authors.replaceChildren();
        const corresponding=new Set(paper.corresponding_authors||[]);
        paper.authors.forEach((name,index)=>{
          if(index)authors.append(index===4?document.createElement('br'):document.createTextNode(' · '));
          authors.append(document.createTextNode(name));
          if(corresponding.has(name)){
            const marker=document.createElement('sup');
            marker.className='corresponding-mark';marker.textContent='†';
            marker.title='Corresponding author';marker.setAttribute('aria-label','Corresponding author');
            authors.append(marker);
          }
        });
      }
      // Release links remain text until the author supplies an actual public URL.
      $$('[data-release]').forEach(placeholder=>{
        const key=placeholder.dataset.release, url=paper.links?.[key];
        if(typeof url!=='string' || !/^https:\/\//.test(url)) return;
        const link=document.createElement('a');
        link.href=url;link.target='_blank';link.rel='noopener';
        link.className=placeholder.className.replace('coming-soon','').trim();
        link.textContent=key==='paper'?'Paper ↗':'Code ↗';
        placeholder.replaceWith(link);
      });
      renderDemos();renderResults();await refreshVideos();
      loadComparisons().catch(error=>{ $('#sota-tables').textContent='Comparison tables could not load. Refresh the local preview.';console.error(error); });
      loadCases().catch(error=>{ $('#case-grid').textContent='Case studies could not load. Refresh the local preview.';console.error(error); });
      setInterval(()=>{if(!document.hidden)refreshVideos();},12000);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshVideos();});
    }catch(error){
      $('#benchmark-grid').innerHTML='<p class="content-error">Please open the local preview server to load the gallery.</p>';
      $('#results-caption').textContent='Results could not load. Refresh the local preview.';
      console.error(error);
    }
  }
  init();
})();
