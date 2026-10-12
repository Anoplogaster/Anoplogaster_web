/* Native approved-art registration; continuous, memory-only consumption.
 * No artwork mutation, game/audio import, persistence, or restoration controls. */
(() => {
  'use strict';
  const root = document.querySelector('[data-software-scene]');
  if (!root) return;
  const stage = root.querySelector('[data-software-stage]');
  const angler = root.querySelector('#software-anglerfish');
  const whale = root.querySelector('#software-whalefish');
  const female = whale.querySelector('img');
  const male = root.querySelector('[data-software-whale-male]');
  const home = root.querySelector('[data-software-whale-home]');
  const status = root.querySelector('[data-software-scene-status]');
  const consumedLabel = root.querySelector('#software-consumed');
  const motion = matchMedia('(prefers-reduced-motion:reduce)');
  const NATURAL = { width:2172, height:1026, mouthX:435, mouthY:520,
    maleRatio:.28413012373044, maleAspect:753/2089 };
  const entries = ['sequences','metrics'].map(id => {
    const app = root.querySelector(`[data-software-app="${id}"]`);
    return { id, app, anchor:app?.querySelector('[data-software-icon-anchor]'),
      image:app?.querySelector('[data-software-icon]'), captured:null, lastAnchor:null };
  }).filter(entry => entry.app && entry.anchor && entry.image);
  const urls = { rest:female.src, opening:whale.dataset.openingSrc, maximum:whale.dataset.maximumSrc };
  const state = { phase:'idle', elapsed:0, phaseElapsed:0, index:0, pose:'rest',
    position:null, male:null, consumed:[], started:false, overlay:false,
    pageHidden:false, ready:false, simplified:motion.matches, events:[],
    openingFrom:null, openingGoal:null, prepElapsed:0, prepDuration:.58, prepDelay:.30,
    speed:0, reducedElapsed:0, needsResize:false };
  let frameId = null, prior = 0, loadPromise = null;
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const ease = value => value*value*(3-2*value);
  const lerp = (from,to,amount) => from+(to-from)*amount;
  const sourceX = NATURAL.mouthX/NATURAL.width;
  const sourceY = NATURAL.mouthY/NATURAL.width;
  const sourceHeight = NATURAL.height/NATURAL.width;

  function dimensions() {
    const rect = stage.getBoundingClientRect();
    return { x:rect.left, y:rect.top, width:rect.width, height:rect.height };
  }
  function relativeRect(element) {
    const box = dimensions(), rect = element.getBoundingClientRect();
    return { x:rect.left-box.x, y:rect.top-box.y, w:rect.width, h:rect.height };
  }
  function anchor(entry) {
    const rect = relativeRect(entry.anchor);
    if (rect.w && rect.h) entry.lastAnchor = { x:rect.x+rect.w/2, y:rect.y+rect.h/2, w:rect.w, h:rect.h };
    return entry.lastAnchor;
  }
  function homePosition() {
    const rect = relativeRect(home);
    return { x:rect.x, y:rect.y, w:rect.w };
  }
  function localMouth(position = state.position) {
    return { x:position.x+position.w*sourceX, y:position.y+position.w*sourceY };
  }
  function mouth() {
    if (!state.position) return null;
    const box = dimensions(), point = localMouth();
    return { x:box.x+point.x, y:box.y+point.y };
  }
  function record(event) {
    state.events.push({ ...event, elapsed:state.elapsed });
    stage.dispatchEvent(new CustomEvent('software:scene-event',{bubbles:true,detail:{...event}}));
  }
  function imagePose(pose) {
    if (state.pose === pose) return;
    state.pose = pose;
    female.src = urls[pose];
    female.alt = `Approved female Rhamphocetichthys savagei, ${pose === 'maximum' ? 'maximum gape' : pose === 'opening' ? 'opening mouth' : 'resting pose'}`;
  }
  function writePosition(element,position) {
    const box = dimensions();
    // Responsive container-relative placement scales uniformly during a resize;
    // the raster always retains its native aspect and (0,0) registration.
    element.style.left = (position.x/box.width*100)+'%';
    element.style.top = (position.y/box.height*100)+'%';
    element.style.width = (position.w/box.width*100)+'%';
  }
  function renderPosition(position,dt = 0) {
    state.position = { x:position.x, y:position.y, w:position.w };
    writePosition(whale,state.position);
    const target = { x:position.x+position.w*.68, y:position.y+position.w*.36,
      w:position.w*NATURAL.maleRatio };
    // A separate lagged rigid sprite, never physically attached to the female.
    if (!state.male) state.male = { ...target };
    const blend = dt > 0 ? 1-Math.exp(-dt*5.5) : 0;
    state.male = { x:lerp(state.male.x,target.x,blend),
      y:lerp(state.male.y,target.y,blend), w:target.w };
    writePosition(male,state.male);
    male.style.visibility = 'visible';
  }
  function idleMale() {
    if (state.phase !== 'idle' || state.started) return;
    const position = homePosition(), box = dimensions(), width = position.w*NATURAL.maleRatio;
    const point = { x:clamp(position.x+position.w*.68,6,box.width-width-6),
      y:clamp(position.y+position.w*.36,6,box.height-width*NATURAL.maleAspect-6), w:width };
    writePosition(male,point);
    male.style.visibility = 'visible';
  }
  function phase(name) {
    state.phase = name;
    state.phaseElapsed = 0;
    stage.dataset.state = name;
    record({type:'phase',phase:name,consumed:state.consumed.slice()});
  }
  function active() { return !['idle','consumed','error'].includes(state.phase); }
  function blocked() { return document.hidden || state.overlay || state.pageHidden; }
  function schedule() {
    if (frameId === null && active() && !blocked()) frameId = requestAnimationFrame(frame);
  }
  function pause() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    prior = 0;
    stage.classList.toggle('is-paused',blocked());
  }

  function prepareOpening(from,remaining = false) {
    const box = dimensions(), first = anchor(entries[state.index]);
    const lead = Math.min(18,first.w*.18);
    let goal = { ...from };
    // On the vertically stacked layout the resting mouth lies LEFT of the
    // right-hand placeholder. Fit/reposition during the initial opening,
    // then use one fixed-scale uninterrupted LEFTWARD traversal. The complete
    // source canvas remains inside the stage throughout this preparation.
    if (localMouth(from).x <= first.x+lead) {
      const width = Math.max(24,Math.min(from.w,(box.width-6-first.x-lead)/(1-sourceX)));
      goal = { x:first.x+lead-width*sourceX,
        y:clamp(first.y-width*sourceY,6,Math.max(6,box.height-width*sourceHeight-6)), w:width };
    }
    state.openingFrom = { ...from };
    state.openingGoal = goal;
    state.prepElapsed = 0;
    state.prepDelay = remaining ? 0 : .30;
    const distance = Math.hypot(goal.x-from.x,goal.y-from.y);
    state.prepDuration = Math.max(remaining ? .25 : .58,distance/145+(remaining ? 0 : .30));
  }
  function beginMoving() {
    state.speed = clamp(dimensions().width/5.2,55,200);
    state.reducedElapsed = 0;
    phase('moving');
    status.textContent = 'Right placeholder first, then left.';
  }
  function consumeEntry(entry) {
    if (state.consumed.includes(entry.id)) return;
    const point = mouth(), rect = entry.image.getBoundingClientRect();
    const iconCenter = { x:rect.left+rect.width/2, y:rect.top+rect.height/2 };
    entry.app.hidden = true;
    entry.app.setAttribute('aria-hidden','true');
    state.consumed.push(entry.id);
    record({type:'consumed',id:entry.id,order:state.consumed.length,
      mouth:point,iconCenter,reducedMotion:state.simplified});
    state.index++;
    status.textContent = state.index < entries.length ? 'Left placeholder entering the mouth.' : 'Both placeholders consumed.';
  }
  function finish() {
    // Never return home or revive either fish after exit. No RAF remains.
    whale.hidden = true;
    male.hidden = true;
    male.style.visibility = 'hidden';
    state.phase = 'consumed';
    stage.dataset.state = 'consumed';
    stage.classList.remove('is-consuming');
    consumedLabel.hidden = false;
    status.textContent = 'Software consumed. Refresh the page to restore both placeholders.';
    record({type:'complete',consumed:state.consumed.slice()});
    pause();
  }
  function move(dt) {
    const entry = entries[state.index];
    const target = entry ? anchor(entry) : null;
    let speed = state.speed;
    if (target) {
      const point = localMouth();
      const verticalTime = Math.abs(target.y-point.y)/Math.max(1,state.speed*.9);
      const availableX = point.x-target.x-target.w*.32;
      // Reflow can move an icon row. Retain negative X, slow modestly if needed
      // and steer Y continuously; never restart, reverse or teleport the fish.
      if (verticalTime > Math.max(0,availableX)/speed) speed = Math.max(25,Math.min(speed,Math.max(0,availableX)/Math.max(.25,verticalTime)));
    }
    const position = { ...state.position, x:state.position.x-speed*dt };
    if (target) {
      const goalY = target.y-position.w*sourceY;
      position.y += clamp(goalY-position.y,-state.speed*.9*dt,state.speed*.9*dt);
    }
    renderPosition(position,dt);
    if (entry) {
      const point = localMouth();
      if (!entry.captured && point.x <= target.x+target.w*.32
          && Math.abs(point.y-target.y) <= target.h*.55) {
        entry.captured = { elapsed:0 };
        record({type:'mouth-contact',id:entry.id,mouth:mouth(),
          iconCenter:{x:dimensions().x+target.x,y:dimensions().y+target.y}});
      }
      if (entry.captured) {
        entry.captured.elapsed += dt;
        const progress = clamp(entry.captured.elapsed/.48,0,1), amount = ease(progress);
        const movingMouth = localMouth();
        // The target is the CURRENT mouth on every frame, not a frozen contact
        // point. Only the app icon moves/scales; anchors/layout stay untouched.
        entry.image.style.transform = `translate(${(movingMouth.x-target.x)*amount}px,${(movingMouth.y-target.y)*amount}px) scale(${1-.94*amount})`;
        if (progress >= 1) consumeEntry(entry);
      }
    }
    if (state.index === entries.length
        && state.position.x+state.position.w < -8
        && state.male.x+state.male.w < -8) finish();
  }
  function simplifiedMove(dt) {
    // Static sequential accessibility alternative: no long fish/icon sweep.
    state.reducedElapsed += dt;
    const entry = entries[state.index];
    if (entry && state.reducedElapsed >= .36) {
      consumeEntry(entry);
      state.reducedElapsed = 0;
    } else if (!entry && state.reducedElapsed >= .22) finish();
  }
  function frame(now) {
    frameId = null;
    if (blocked() || !active()) { prior = 0; return; }
    const dt = prior ? Math.min((now-prior)/1000,.06) : 0;
    prior = now;
    state.elapsed += dt;
    state.phaseElapsed += dt;
    if (state.phase === 'opening') {
      imagePose(state.phaseElapsed < .12 ? 'rest' : state.phaseElapsed < .30 ? 'opening' : 'maximum');
      state.prepElapsed += dt;
      if (!state.simplified) {
        const progress = clamp((state.prepElapsed-state.prepDelay)/Math.max(.001,state.prepDuration-state.prepDelay),0,1), amount = ease(progress);
        renderPosition({ x:lerp(state.openingFrom.x,state.openingGoal.x,amount),
          y:lerp(state.openingFrom.y,state.openingGoal.y,amount),
          w:lerp(state.openingFrom.w,state.openingGoal.w,amount) },dt);
      }
      if (state.phaseElapsed >= (state.simplified ? .34 : .30)
          && (state.simplified || state.prepElapsed >= state.prepDuration)) beginMoving();
    } else if (state.phase === 'moving') {
      if (state.simplified) simplifiedMove(dt);
      else move(dt);
    }
    schedule();
  }
  function preloadPoses() {
    if (!loadPromise) loadPromise = Promise.all([urls.opening,urls.maximum].map(src => new Promise((resolve,reject) => {
      const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = src;
    })));
    return loadPromise;
  }
  async function consume() {
    if (state.started || !state.ready || entries.length !== 2) return;
    state.started = true;
    state.simplified = motion.matches;
    whale.disabled = true;
    const rect = relativeRect(whale), maleRect = relativeRect(male);
    state.position = { x:rect.x, y:rect.y, w:rect.w };
    state.male = { x:maleRect.x, y:maleRect.y, w:maleRect.w };
    entries.forEach(anchor);
    whale.classList.add('is-swimming');
    male.classList.add('is-following');
    stage.classList.add('is-consuming');
    renderPosition(state.position);
    status.textContent = 'Preparing approved mouth poses.';
    try {
      await preloadPoses();
      prepareOpening(state.position);
      phase('opening');
      prior = 0;
      schedule();
    } catch (_) {
      state.phase = 'error';
      status.textContent = 'Mouth artwork could not be loaded. Reload the page to try again.';
      stage.classList.remove('is-consuming');
      pause();
    }
  }
  function resize() {
    // Scroll-lock/reflow behind the arcade dialog must not mutate a frozen
    // scene snapshot. Apply any pending geometry once the host resumes it.
    if (active() && blocked()) { state.needsResize=true; return; }
    state.needsResize=false;
    if (active() && state.position) {
      const rect = relativeRect(whale), maleRect = relativeRect(male);
      state.position = { x:rect.x, y:rect.y, w:rect.w };
      state.male = { x:maleRect.x, y:maleRect.y, w:maleRect.w };
      entries.filter(entry => !entry.app.hidden).forEach(anchor);
      if (state.phase === 'opening') prepareOpening(state.position,true);
      if (state.phase === 'moving') state.speed = clamp(dimensions().width/5.2,55,200);
    } else idleMale();
  }
  angler.addEventListener('click',() => angler.dispatchEvent(new CustomEvent('software:open-game',{bubbles:true})));
  whale.addEventListener('click',consume);
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',() => { pause(); if (state.needsResize && !blocked()) resize(); schedule(); });
  document.addEventListener('software:game-open',() => { state.overlay=true; pause(); });
  document.addEventListener('software:game-close',() => { state.overlay=false; pause(); if (state.needsResize) resize(); schedule(); });
  motion.addEventListener('change',() => {
    if (motion.matches && state.started) state.simplified = true;
    pause(); resize(); schedule();
  });
  Promise.all([female,male,...root.querySelectorAll('.software-diceratias img')].map(image =>
    image.complete && image.naturalWidth ? Promise.resolve() : new Promise((resolve,reject) => {
      image.addEventListener('load',resolve,{once:true}); image.addEventListener('error',reject,{once:true});
    }))).then(() => { state.ready=true; whale.disabled=false; idleMale(); })
    .catch(() => { status.textContent='A fish illustration could not be loaded.'; });
  window.addEventListener('pagehide',() => { state.pageHidden=true; pause(); observer.disconnect(); });
  window.addEventListener('pageshow',() => { state.pageHidden=false; observer.observe(stage); schedule(); });
  window.SoftwareScene = Object.freeze({
    get ready() { return state.ready; }, get phase() { return state.phase; },
    get consumed() { return state.consumed.slice(); },
    get events() { return JSON.parse(JSON.stringify(state.events)); },
    get position() { return state.position ? {...state.position} : null; },
    get male() { return state.male ? {...state.male} : null; },
    get mouth() { return mouth(); }, get elapsed() { return state.elapsed; },
    get pose() { return state.pose; }, get frameId() { return frameId; },
    get reducedMotion() { return motion.matches; }, get paused() { return blocked(); }
  });
})();
