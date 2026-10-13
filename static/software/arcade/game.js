/* Angry Anglerfish: browser presentation/input only. The immutable Enhanced
 * image is drawn whole; anatomy coordinates and gameplay live in engine.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 1200, H = 600;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ready = false, exited = false, frameId = null, newPersonalBest = false;
  let previous = 0, accumulator = 0, ambientTime = 0, lastState = '';
  let backingScale = 1;
  let mobileMode = '', layoutFrame = null, settingsResume = false;
  const settingsDialog = $('mobile-settings-dialog');
  const relocated = [];
  const embedded = window.top !== window;
  document.documentElement.dataset.embeddedArcade = String(embedded);
  const images = {};
  const sounds = new ArcadeAudio();
  const scores = new ArcadeScores();
  const vessels = new ArcadeVessels({ reducedMotion });
  const listeners = new AbortController();
  const listen = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal: listeners.signal });
  let learning = null, learningUi = null, lessonResume = false, reviewResume = false;
  const engine = new ArcadeEngine({ darterEnabled: true, onEvent: event => {
    if (event.type === 'start') vessels.reset();
    sounds.setState(engine.state);
    sounds.play(event.type);
    if (event.type === 'eat' && event.label === 'FARTER') $('live-status').textContent = `FARTER +${event.value}`;
    if (event.type === 'damage') $('live-status').textContent = `${engine.hearts} ${engine.hearts === 1 ? 'heart' : 'hearts'} remaining.`;
    if (event.type === 'attach') $('live-status').textContent = `Male attached. ${event.count} of ${ArcadeEngine.MAX_MALES}. Future prey multiplier ${event.multiplier.toFixed(2)}.`;
    if (event.type === 'death') {
      releaseInputs();
      $('live-status').textContent = `Dive ended. Final score ${engine.score}.`;
    }
    if (event.type === 'over') {
      newPersonalBest = scores.record(engine.score);
      releaseInputs();
      $('live-status').textContent = `Game over. Score ${engine.score}.${newPersonalBest ? ' New local personal best.' : ''}`;
    }
    // Record in actual event order. Present the first new discovery at this
    // same atomic step's boundary: damage/feeding finish before clocks freeze.
    learning?.handleEvent(event);
  }});
  engine.reducedMotion = reducedMotion;
  learning = new ArcadeLearning({ curriculum: ArcadeCurriculum,
    onChange: () => learningUi?.sync(learning, engine.state),
    onLesson: lesson => {
      lessonResume = engine.state === 'playing';
      pause(true);
      renderHud(); // Suppress normal pause/game-over results behind the lesson.
      learningUi.showLesson(lesson);
      $('live-status').textContent = `Discovery: ${lesson.title}. Dive and music paused. No reading time limit.`;
    },
    onCloseLesson: () => {
      learningUi.closeLesson();
      const shouldResume = lessonResume; lessonResume = false;
      if (shouldResume && !exited && !document.hidden) resume();
      else renderHud();
    }
  });
  function openDiscoveryReview() {
    if (engine.state === 'dying') return; // Never interrupt the death animation.
    const wasPlaying = engine.state === 'playing' || Boolean(settingsDialog?.open && settingsResume);
    if (settingsDialog?.open) closeSettings(false);
    if (!learning.openReview()) return;
    reviewResume = wasPlaying;
    if (engine.state === 'playing') pause(true);
    learningUi.showReview({ ids: [...learning.collectionIds], gameIds: [...learning.gameDiscoveries], state: engine.state });
    publishHostLayout();
  }
  learningUi = new ArcadeLearningUI({ curriculum: ArcadeCurriculum,
    onToggle: enabled => learning.setEnabled(enabled),
    onCloseLesson: reason => learning.closeLesson(reason),
    onReview: openDiscoveryReview,
    onCloseReview: () => {
      learning.closeReview();
      const shouldResume = reviewResume; reviewResume = false;
      if (shouldResume && !exited && !document.hidden) resume();
      else renderHud();
    },
    onChoice: enabled => learning.chooseExperience(enabled)
  });
  learningUi.sync(learning, engine.state);
  // Development access for repeatable local acceptance checks, not a second game.
  window.anglerfishArcade = { engine, assets: images, sounds, scores, vessels, learning, learningUi, exit: exitGame,
    refreshViewport, openSettings,
    get mobileMode() { return mobileMode; },
    get ready() { return ready; }, get exited() { return exited; }, get frameId() { return frameId; } };

  const keyMap = { w:'up', W:'up', ArrowUp:'up', s:'down', S:'down', ArrowDown:'down',
    a:'left', A:'left', ArrowLeft:'left', d:'right', D:'right', ArrowRight:'right', ' ':'lure' };
  const codeMap = { KeyW:'up', ArrowUp:'up', KeyS:'down', ArrowDown:'down',
    KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right', Space:'lure' };
  const keys = new Set(), pointers = new Map();
  const joystick = $('swim-joystick');
  const joystickInput = { up:false, down:false, left:false, right:false };
  let joystickPointer = null;
  function syncInput() {
    for (const control of ['up','down','left','right','lure']) {
      engine.input[control] = [...keys].some(key => (codeMap[key] || keyMap[key]) === control) ||
        [...pointers.values()].includes(control) || Boolean(joystickInput[control]);
      document.querySelector(`[data-control="${control}"]`)?.classList.toggle('held', engine.input[control]);
    }
    joystick.classList.toggle('held', Object.values(joystickInput).some(Boolean));
  }
  function neutralJoystick() {
    const id = joystickPointer; joystickPointer = null;
    Object.keys(joystickInput).forEach(key => joystickInput[key] = false);
    joystick.style.setProperty('--joystick-x','0px'); joystick.style.setProperty('--joystick-y','0px');
    if (id !== null && joystick.hasPointerCapture(id)) joystick.releasePointerCapture(id);
  }
  function releaseInputs(preserveLure = Boolean(learning?.activeLesson)) {
    keys.clear(); neutralJoystick();
    for (const id of pointers.keys()) document.querySelectorAll('[data-control]').forEach(button => {
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    });
    pointers.clear(); syncInput();
    if (!preserveLure) {
      if (engine.setLure) engine.setLure(false);
      else engine.lure = false;
    }
  }
  function start() {
    if (!ready || exited || engine.state === 'dying' || learning.blocked) return;
    sounds.unlock(); newPersonalBest = false;
    releaseInputs(); engine.start(); accumulator = 0; previous = performance.now();
    canvas.focus({ preventScroll: true }); renderHud();
    learning.tick(engine);
  }
  function pause(educational = false) {
    if (engine.state !== 'playing' || (learning.blocked && !educational)) return;
    const preserveLure = Boolean(learning.activeLesson);
    engine.pause({ preserveLure }); releaseInputs(preserveLure); accumulator = 0; renderHud();
  }
  function resume() {
    if (engine.state !== 'paused' || exited || learning.blocked) return;
    sounds.unlock();
    releaseInputs(); engine.resume(); previous = performance.now(); accumulator = 0;
    canvas.focus({ preventScroll: true }); renderHud();
  }
  listen($('overlay-action'), 'click', () => engine.state === 'paused' ? resume() : start());
  listen($('start-button'), 'click', () => {
    if (engine.state === 'paused') resume();
    else if (engine.state === 'playing') pause();
    else start();
  });
  listen($('pause-button'), 'click', () => engine.state === 'paused' ? resume() : pause());
  listen($('mobile-pause-button'), 'click', () => engine.state === 'paused' ? resume() : pause());
  listen($('mobile-settings-button'), 'click', openSettings);
  listen($('mobile-settings-close'), 'click', () => closeSettings());
  listen($('mobile-exit-button'), 'click', exitGame);
  listen(settingsDialog, 'cancel', event => { event.preventDefault(); closeSettings(); });
  // Native Settings owns keys exactly as the existing lesson/review dialogs do.
  listen(settingsDialog, 'keydown', event => event.stopPropagation());
  listen(settingsDialog, 'keyup', event => event.stopPropagation());
  function openSettings() {
    if (!mobileMode || exited || learning.blocked || settingsDialog.open || engine.state === 'dying') return;
    settingsResume = engine.state === 'playing';
    if (settingsResume) pause(true);
    releaseInputs(); settingsDialog.showModal();
    $('mobile-settings-close').focus({ preventScroll: true });
    publishHostLayout();
  }
  function closeSettings(resumePrevious = true) {
    if (!settingsDialog.open) return;
    settingsDialog.close();
    const shouldResume = settingsResume && resumePrevious; settingsResume = false;
    $('mobile-settings-button').focus({ preventScroll: true });
    if (shouldResume && !exited && !document.hidden && !learning.blocked) resume();
    publishHostLayout();
  }
  function renderAudioControls() {
    $('sound-button').querySelector('.audio-label').textContent = sounds.enabled ? 'SFX ON' : 'SFX OFF';
    $('sound-button').setAttribute('aria-pressed', String(sounds.enabled));
    $('music-button').querySelector('.audio-label').textContent = sounds.musicEnabled ? 'MUSIC ON' : 'MUSIC OFF';
    $('music-button').setAttribute('aria-pressed', String(sounds.musicEnabled));
  }
  renderAudioControls();
  listen($('sound-button'), 'click', () => {
    sounds.enable();
    renderAudioControls();
    if (engine.state === 'playing') canvas.focus({ preventScroll: true });
  });
  listen($('music-button'), 'click', () => {
    sounds.toggleMusic(); renderAudioControls();
    if (engine.state === 'playing') canvas.focus({ preventScroll: true });
  });
  listen($('exit-button'), 'click', exitGame);
  listen(window, 'keydown', event => {
    if (learning.blocked || settingsDialog.open) return; // Native dialogs own keyboard input.
    // Do not swallow normal keyboard activation on buttons or other controls.
    if (event.key === 'Escape') { event.preventDefault(); if (!event.repeat) engine.state === 'paused' ? resume() : pause(); return; }
    const control = keyMap[event.key];
    if (!control || engine.state !== 'playing') return;
    if (event.key === ' ' && event.target instanceof HTMLButtonElement) return;
    event.preventDefault(); keys.add(event.code || event.key); syncInput();
  });
  listen(window, 'keyup', event => {
    const control = keyMap[event.key];
    if (control) {
      keys.delete(event.code || event.key); syncInput();
      if (engine.state === 'playing' && !(event.key === ' ' && event.target instanceof HTMLButtonElement)) event.preventDefault();
    }
  });
  document.querySelectorAll('[data-control]').forEach(button => {
    listen(button, 'pointerdown', event => {
      if (engine.state !== 'playing') return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.control); syncInput();
    });
    const release = event => { pointers.delete(event.pointerId); syncInput(); };
    listen(button, 'pointerup', release);
    listen(button, 'pointercancel', release);
    listen(button, 'lostpointercapture', release);
    listen(button, 'contextmenu', event => event.preventDefault());
  });
  function moveJoystick(event) {
    if (event.pointerId !== joystickPointer || engine.state !== 'playing') return;
    event.preventDefault();
    const rect = joystick.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width/2, dy = event.clientY - rect.top - rect.height/2;
    const distance = Math.hypot(dx,dy), radius = Math.min(rect.width,rect.height)*.32;
    const factor = distance > radius ? radius/distance : 1;
    joystick.style.setProperty('--joystick-x', `${dx*factor}px`);
    joystick.style.setProperty('--joystick-y', `${dy*factor}px`);
    const active = distance > 12, x = active ? dx/distance : 0, y = active ? dy/distance : 0;
    joystickInput.up = y < -.35; joystickInput.down = y > .35;
    joystickInput.left = x < -.35; joystickInput.right = x > .35;
    syncInput();
  }
  listen(joystick, 'pointerdown', event => {
    if (engine.state !== 'playing' || joystickPointer !== null) return;
    event.preventDefault(); joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId); moveJoystick(event);
  });
  listen(joystick, 'pointermove', moveJoystick);
  const releaseJoystick = event => { if (event.pointerId === joystickPointer) { neutralJoystick(); syncInput(); } };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(joystick,type,releaseJoystick);
  listen(joystick, 'contextmenu', event => event.preventDefault());
  listen(window, 'blur', () => { pause(); releaseInputs(); if (engine.state === 'dying') sounds.stopAll(); previous = 0; });
  listen(document, 'visibilitychange', () => { if (document.hidden) { settingsResume = false; pause(); releaseInputs(); if (engine.state === 'dying') sounds.stopAll(); previous = 0; } });
  listen(window, 'pagehide', () => cleanExit());
  // A future same-document Software-page host cancels this event, closes the
  // cabinet, and restores its own page without reloading. Standalone is local.
  function cleanExit() {
    if (exited) return false;
    scores.record(engine.score);
    exited = true; releaseInputs(); engine.exit(); ready = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
    frameId = null; accumulator = 0; previous = 0;
    sounds.destroy(); vessels.clear(); resizeObserver.disconnect(); listeners.abort();
    dialogObserver.disconnect();
    if (settingsDialog.open) settingsDialog.close();
    learning.destroy(); learningUi.destroy();
    document.body.dataset.state = 'exited';
    $('live-status').textContent = 'Game closed. Gameplay and audio stopped.';
    return true;
  }
  function exitGame() {
    if (!cleanExit()) return;
    const event = new CustomEvent('anglerfish-arcade:exit', { bubbles: true, cancelable: true,
      detail: { score: engine.score, time: engine.time, best: scores.best } });
    if (document.querySelector('.arcade').dispatchEvent(event)) location.assign(new URL('landing.html', document.baseURI).href);
  }

  function relocate(node, destination) {
    if (!node || !destination) return;
    const anchor = document.createComment('desktop arcade position');
    node.before(anchor); relocated.push({ node, anchor }); destination.append(node);
  }
  function mobileStructure(active) {
    if (active && !relocated.length) {
      relocate(document.querySelector('.learning-control-row'), $('mobile-settings-controls'));
      const audio = document.createElement('div'); audio.className = 'mobile-audio-controls';
      $('mobile-settings-controls').append(audio);
      relocate($('sound-button'), audio); relocate($('music-button'), audio);
      for (const selector of ['.instrument-males','.instrument-multiplier','.instrument-best','#discovery-counter']) {
        relocate(document.querySelector(selector), $('mobile-settings-telemetry'));
      }
      relocate($('learning-summary'), $('mobile-postgame-slot'));
      relocate($('learning-prompt'), $('mobile-postgame-slot'));
    } else if (!active && relocated.length) {
      if (settingsDialog.open) closeSettings();
      for (const {node,anchor} of relocated.splice(0)) { anchor.replaceWith(node); }
      $('mobile-settings-controls').querySelector('.mobile-audio-controls')?.remove();
    }
  }
  function publishHostLayout() {
    if (!embedded) return;
    const rect = $('mobile-exit-button').getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('anglerfish-arcade:layout', { detail: {
      mode: mobileMode, exit: { x:rect.x, y:rect.y, width:rect.width, height:rect.height },
      modal: settingsDialog.open || Boolean(document.querySelector('.learning-dialog[open]'))
    }}));
  }
  function refreshViewport(safeArea) {
    if (safeArea) for (const edge of ['top','right','bottom','left']) {
      document.documentElement.style.setProperty(`--arcade-safe-${edge}`, `${Math.max(0,Number(safeArea[edge])||0)}px`);
    }
    if (layoutFrame !== null || exited) return;
    layoutFrame = requestAnimationFrame(() => { layoutFrame = null; resize(); });
  }
  function resize() {
    if (exited) return;
    const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const nextMode = innerWidth <= 740 || (touch && innerWidth <= 1200)
      ? (innerWidth > innerHeight ? 'landscape' : 'portrait') : '';
    const modeChanged = nextMode !== mobileMode;
    mobileMode = nextMode;
    if (mobileMode) {
      document.documentElement.dataset.mobileArcade = mobileMode;
      const visual = window.visualViewport;
      const normalScale = !visual || Math.abs(visual.scale - 1) < .02;
      document.documentElement.style.setProperty('--arcade-height', `${normalScale && visual ? visual.height : innerHeight}px`);
    } else delete document.documentElement.dataset.mobileArcade;
    mobileStructure(Boolean(mobileMode));
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    if (width <= 0 || rect.height <= 0) return;
    let worldWidth = 1200, worldHeight = 600;
    if (mobileMode === 'portrait') { worldWidth = 720; worldHeight = 720 * rect.height / width; }
    else if (mobileMode === 'landscape') { worldHeight = 600; worldWidth = 600 * width / rect.height; }
    const geometryChanged = engine.setViewport(worldWidth, worldHeight);
    W = engine.width; H = engine.height; vessels.setViewport(W,H);
    if (geometryChanged || modeChanged) releaseInputs();
    const ratio = Math.min(devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(canvas.width * H / W));
    backingScale = canvas.width / W;
    ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
    // Resample the original full-resolution image directly at screen resolution.
    // No intermediary sprites, filter, source crop, or artwork mutation.
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    publishHostLayout();
  }
  const resizeObserver = new ResizeObserver(() => refreshViewport());
  resizeObserver.observe(canvas);
  listen(window, 'resize', () => refreshViewport());
  if (window.visualViewport) {
    listen(window.visualViewport, 'resize', () => refreshViewport());
    listen(window.visualViewport, 'scroll', () => refreshViewport());
  }
  const dialogObserver = new MutationObserver(publishHostLayout);
  for (const dialog of [settingsDialog,$('learning-lesson-dialog'),$('learning-review-dialog')]) {
    dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']});
  }
  refreshViewport();

  const snow = Array.from({ length: 72 }, (_, i) => ({ x:(i*179.37)%W, y:(i*97.83)%H, r:i%5 === 0 ? 1.5 : .7, layer:i%3 }));
  function environment() {
    const travel = engine.scroll + (engine.state === 'ready' ? ambientTime * 20 : 0);
    const water = ctx.createLinearGradient(0,0,0,H);
    water.addColorStop(0,'#071c26'); water.addColorStop(.5,'#061923'); water.addColorStop(1,'#020c13');
    ctx.fillStyle = water; ctx.fillRect(0,0,W,H);
    // Vessel candidates are distant background only. Draw before every game
    // actor, terrain silhouette and particle; they never enter the simulation.
    vessels.draw(ctx,images);
    // Periodic geometry wraps beyond the screen; no bitmap seam or abrupt reset.
    for (let i=-1; i<8; i++) {
      const x = i*240 - (travel*.13)%240;
      ctx.fillStyle = '#0b2730';
      ctx.beginPath(); ctx.moveTo(x,H); ctx.lineTo(x+45,H-78); ctx.lineTo(x+87,H-63);
      ctx.lineTo(x+145,H-128); ctx.lineTo(x+192,H-105); ctx.lineTo(x+240,H); ctx.fill();
      ctx.fillStyle = 'rgba(35,83,89,.16)'; ctx.fillRect(x+103,H-125,4,125);
    }
    for (const p of snow) {
      const speed = [.25,.58,1.05][p.layer];
      const x = ((p.x / 1200 * W - travel*speed)%W + W)%W;
      const y = p.y / 600 * H + (reducedMotion ? 0 : Math.sin(ambientTime*.23 + p.x)*5);
      ctx.fillStyle = p.layer === 2 ? 'rgba(99,190,195,.24)' : 'rgba(148,188,194,.16)';
      ctx.beginPath(); ctx.arc(x,y,p.r,0,Math.PI*2); ctx.fill();
    }
    for (let i=0; i<9; i++) {
      const x=((i*317-travel*.4)%W+W)%W, y=(100+(i*113)%390)/600*H;
      ctx.fillStyle = i%3 === 0 ? 'rgba(225,159,75,.25)' : 'rgba(77,190,189,.3)';
      ctx.fillRect(Math.round(x),y,2,2);
    }
    const edges = ctx.createRadialGradient(W*.48,H*.44,H*.2,W*.5,H*.5,W*.6);
    edges.addColorStop(0,'rgba(0,0,0,0)'); edges.addColorStop(1,'rgba(0,3,9,.55)');
    ctx.fillStyle = edges; ctx.fillRect(0,0,W,H);
  }
  function prey(fish) {
    const image = images[fish.kind];
    if (!image) return; // No generic-fish substitution for another organism.
    // Draw each complete transparent PNG at its own natural aspect, including
    // antennae, appendages, fins and tentacles. Approved darter stays unchanged.
    const height = fish.w * image.naturalHeight / image.naturalWidth;
    ctx.drawImage(image, Math.round(fish.x-fish.w/2), Math.round(fish.y-height/2), fish.w, height);
  }
  function enemy(fish) {
    if (fish.x-fish.w/2 > W) {
      // Small interface cue gives the off-screen approach real visible warning
      // at the newly reachable right edge. It never alters hazard artwork.
      const offset = fish.hitParts?.[0]?.y ?? fish.hitOffsetY ?? 0;
      const y = Math.max(12, Math.min(H-12, fish.y+offset));
      ctx.save(); ctx.strokeStyle='#ff2454'; ctx.lineWidth=2; ctx.globalAlpha=.8;
      ctx.beginPath(); ctx.moveTo(W-7,y-6); ctx.lineTo(W-13,y); ctx.lineTo(W-7,y+6); ctx.stroke();
      ctx.restore();
    }
    // Exact full-resolution developed artwork, not a substitute silhouette.
    const image = fish.kind === 'atolla' ? images.atolla : images.lancetfish;
    ctx.drawImage(image, Math.round(fish.x-fish.w/2), Math.round(fish.y-fish.h/2), fish.w, fish.h);
  }
  function maleImage(x, y, rotation = 0, mirror = false) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rotation);
    if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(images.male, -ArcadeEngine.MALE_WIDTH/2, -ArcadeEngine.MALE_HEIGHT/2,
      ArcadeEngine.MALE_WIDTH, ArcadeEngine.MALE_HEIGHT);
    ctx.restore();
  }
  function male(fish) {
    maleImage(fish.x, fish.y, 0, true);
    // A small interface marker distinguishes this collectible from edible prey.
    // It is outside the source artwork; the PNG itself is never tinted.
    ctx.fillStyle = '#f4bd76'; ctx.font = '500 17px monospace'; ctx.textAlign = 'center';
    ctx.fillText('♂', Math.round(fish.x), Math.round(fish.y - fish.h/2 - 3));
  }
  function player() {
    if (engine.state==='over' && engine.death) return;
    const p=engine.player;
    const death=engine.death;
    const dying=engine.state==='dying' && death;
    const pose=dying ? death.originPose : engine.pose();
    const y=pose.y;
    if (engine.lure) {
      const e=engine.geometry().esca;
      const glow=ctx.createRadialGradient(e.x,e.y,1,e.x,e.y,36);
      glow.addColorStop(0,'rgba(233,246,192,.7)');glow.addColorStop(.15,'rgba(151,227,215,.3)');glow.addColorStop(1,'rgba(68,186,195,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(e.x,e.y,36,0,Math.PI*2);ctx.fill();
    }
    ctx.save();
    if (dying) {
      const ease = t => t*t*(3-2*t);
      const turn=ease(Math.min(1,death.elapsed/1.05))*Math.PI;
      const rise=ease(Math.max(0,Math.min(1,(death.elapsed-.35)/(death.duration-.35))));
      // Rotate the entire unchanged image and attached males around the body.
      // Final pivot is above even the farthest full-image corner, not stretched.
      ctx.translate(death.pivot.x,death.pivot.y-rise*(death.pivot.y+p.width+40));
      ctx.rotate(turn);ctx.translate(-death.pivot.x,-death.pivot.y);
    }
    // Flash by visibility only, never tinting/recoloring the source image.
    if (!dying && p.invulnerable>0 && Math.floor(p.invulnerable*12)%2 === 0) ctx.globalAlpha=.32;
    const feeding = dying && death.feedingPose ? death.feedingPose : engine.feedingPose();
    const image = [images.player, images.playerOpening, images.playerMaximum][feeding.index];
    // Approved square alternate canvases contain extra transparent space below
    // the original registered body. Share scale and origin, not draw height.
    ctx.drawImage(image, pose.x, y, p.width, p.width * image.naturalHeight / image.naturalWidth);
    const slots = engine.attachmentSlots();
    // Rightmost first keeps leftward tails behind neighboring male heads.
    // Slot ownership remains acquisition order; only the painter order changes.
    for (const attachment of engine.attachments.slice().sort((a,b) => slots[b.slot].x-slots[a.slot].x)) {
      const slot = slots[attachment.slot];
      const progress = reducedMotion ? 1 : Math.min(1, (attachment.age+(dying?death.elapsed:0)) / ArcadeEngine.ATTACHMENT_DURATION);
      const blend = progress * progress * (3 - 2 * progress);
      maleImage(attachment.fromX + (slot.x-attachment.fromX)*blend,
        attachment.fromY + (slot.y-attachment.fromY)*blend, slot.rotation*blend);
    }
    if (dying && death.elapsed >= .12) {
      // Profile-view Enhanced female has one visible eye, source(1065,388).
      // This temporary X shares exactly the same whole-body transform.
      const s=p.width/1536, eye={x:pose.x+1065*s,y:pose.y+388*s};
      ctx.strokeStyle='#b9edf2';ctx.lineWidth=2;ctx.lineCap='square';
      ctx.beginPath();ctx.moveTo(eye.x-5,eye.y-5);ctx.lineTo(eye.x+5,eye.y+5);
      ctx.moveTo(eye.x+5,eye.y-5);ctx.lineTo(eye.x-5,eye.y+5);ctx.stroke();
    }
    ctx.restore();
    if(engine.lure) { const e=engine.geometry().esca;ctx.fillStyle='rgba(221,244,220,.65)';ctx.fillRect(Math.round(e.x)-1,Math.round(e.y)-1,2,2); }
  }
  function render() {
    environment();
    engine.prey.filter(fish => !fish.pending).forEach(prey); engine.males.forEach(male);
    if(engine.state==='dying') { engine.enemies.forEach(enemy); player(); }
    else { player(); engine.prey.filter(fish => fish.pending).forEach(prey); engine.enemies.forEach(enemy); }
    ctx.font='500 19px monospace';ctx.textAlign='center';
    if(!['dying','over'].includes(engine.state)) for(const popup of engine.popups) { ctx.globalAlpha=Math.max(0,1-popup.age/1.1);ctx.fillStyle='#caead5';ctx.fillText(`${popup.label ? popup.label+' ' : ''}+${popup.value}`,popup.x,popup.y-popup.age*30); }
    ctx.globalAlpha=1;
  }
  function timeText(seconds) { const n=Math.floor(seconds);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
  function renderHud() {
    $('score-value').textContent=String(engine.score).padStart(6,'0');
    $('time-value').textContent=timeText(engine.time);
    $('male-count').textContent=engine.attachedMaleCount+'/'+ArcadeEngine.MAX_MALES;
    $('multiplier-value').textContent=engine.multiplier.toFixed(2)+'×';
    $('best-value').textContent=String(scores.best).padStart(6,'0');
    $('best-value').previousElementSibling.textContent=scores.available ? 'LOCAL BEST' : 'TAB BEST';
    document.querySelectorAll('[data-heart]').forEach((heart,i)=>heart.classList.toggle('lost',i>=engine.hearts));
    $('hearts').setAttribute('aria-label',`${engine.hearts} of 3 hearts remaining`);
    learningUi.sync(learning, engine.state);
    $('mobile-pause-button').disabled=!ready||!['playing','paused'].includes(engine.state);
    $('mobile-pause-button').textContent=engine.state==='paused'?'RESUME':'PAUSE';
    $('mobile-settings-button').disabled=!ready||engine.state==='dying';
    const presentationState=engine.state+':'+learning.blocked+':'+learning.resultsReady;
    if(lastState===presentationState)return;
    lastState=presentationState;document.body.dataset.state=ready?engine.state:'loading';
    const dying=engine.state==='dying';
    $('game-overlay').hidden=engine.state==='playing'||dying||learning.blocked||(engine.state==='over'&&!learning.resultsReady);
    $('start-button').disabled=!ready||dying||learning.blocked;
    document.querySelectorAll('[data-control]').forEach(button=>button.disabled=!ready||dying||learning.blocked);
    joystick.disabled=!ready||dying||learning.blocked;
    $('pause-button').disabled=!ready||learning.blocked||!['playing','paused'].includes(engine.state);
    $('pause-button').textContent=engine.state==='paused'?'RESUME':'PAUSE';
    $('start-button').textContent=dying?'DIVE ENDING…':engine.state==='playing'?'PAUSE GAME':engine.state==='paused'?'RESUME GAME':engine.state==='over'?'PLAY AGAIN':'START GAME';
    const states={
      ready:['DIVE WHEN READY','ANGRY ANGLERFISH','Avoid the lancetfish and crown jellyfish while eating as much prey as possible. Use your bioluminescent lure to attract prey toward your mouth!','','START GAME'],
      paused:['INSTRUMENTS ON HOLD','PAUSED','Your dive is safe. Resume when you’re ready.','WASD / arrows swim · hold SPACE for the lure','RESUME DIVE'],
      over:['ANGRY ANGLERFISH / SIGNAL LOST','GAME OVER',newPersonalBest ? (scores.available ? 'NEW LOCAL PERSONAL BEST' : 'NEW TAB BEST · browser storage unavailable') : 'Three hearts. One life. Another dive?',`FINAL SCORE ${String(engine.score).padStart(6,'0')} · ${scores.available?'LOCAL BEST':'TAB BEST'} ${String(scores.best).padStart(6,'0')} · SURVIVED ${timeText(engine.time)}`,'PLAY AGAIN']
    };
    const state=states[engine.state];
    if(state) { [$('overlay-kicker').textContent,$('overlay-title').textContent,$('overlay-copy').textContent,$('overlay-result').textContent,$('overlay-action').textContent]=state; }
  }
  function frame(now) {
    if (exited) return;
    const dt=previous?Math.max(0,Math.min((now-previous)/1000,.05)):0;previous=now;
    if(!document.hidden && (engine.state==='playing'||engine.state==='ready')) ambientTime+=dt;
    if(ready) {
      if(!document.hidden && (engine.state==='playing'||engine.state==='dying')) {
        accumulator+=dt;
        while(accumulator>=1/120) {
          engine.update(1/120);
          if(engine.state==='playing')vessels.update(1/120,engine.time);
          accumulator-=1/120;
          learning.tick(engine);
          if (!['playing','dying'].includes(engine.state)) { accumulator = 0; break; }
        }
      } else accumulator=0;
      render();renderHud();
    }
    frameId = requestAnimationFrame(frame);
  }
  Promise.all(Object.entries({player:'assets/diceratias-female-enhanced-approved-v1.png',
    playerOpening:'assets/feeding/diceratias-opening-approved-v1.png',playerMaximum:'assets/feeding/diceratias-maximum-approved-v1.png',
    lanternfish:'assets/prey/lanternfish-v1.png',krill:'assets/prey/krill-v1.png',chaetognath:'assets/prey/chaetognath-v1.png',
    amphipod:'assets/prey/amphipod-v1.png',squid:'assets/prey/squid-v1.png',bristlemouth:'assets/prey/bristlemouth-v1.png',
    hatchetfish:'assets/prey/hatchetfish-v1.png',darter:'assets/prey-darter-approved-v1.png',
    male:'assets/diceratias-male-enhanced.png',atolla:'assets/atolla-wyvillei.png',lancetfish:'assets/alepisaurus-ferox-approved.png',
    bathysphere:'assets/vessels/bathysphere-candidate-v1.png',trieste:'assets/vessels/trieste-candidate-v1.png',challenger:'assets/vessels/deepsea-challenger-candidate-v1.png'}).map(([key,path])=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{images[key]=image;resolve();};image.onerror=()=>reject(new Error(`Missing asset: ${path}`));image.src=path;
  }))).then(()=>{
    if (exited) return;
    // Full-PNG dimensions also govern spawn/vertical safety; transparent
    // appendage padding must never be treated as the old generic fish height.
    for (const kind of Object.keys(ArcadeEngine.PREY_TYPES)) {
      engine.configurePreyArt(kind, images[kind].naturalWidth, images[kind].naturalHeight);
    }
    ready=true;document.querySelectorAll('button').forEach(button=>button.disabled=false);
    lastState='';resize();renderHud();frameId=requestAnimationFrame(frame);
    $('live-status').textContent=scores.available ? 'Ready. Start your dive.' : 'Ready. Browser storage unavailable; personal best is retained only in this tab.';
  }).catch(error=>{
    if (exited) return;
    $('overlay-title').textContent='ASSET LOAD FAILED';$('overlay-copy').textContent=error.message;
    $('live-status').textContent='Keep the assets directory beside index.html and reload.';console.error(error);
  });
})();
