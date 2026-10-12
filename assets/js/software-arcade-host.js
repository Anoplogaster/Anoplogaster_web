/* Same-origin lazy host for the existing buildless game. No game/audio code runs
 * at Software-page startup. Native dialog provides an independent Exit control
 * even before the frame loads; child Escape retains game pause/resume. */
(() => {
  'use strict';
  const dialog = document.getElementById('software-arcade-dialog');
  if (!dialog) return;
  const slot = document.getElementById('software-arcade-frame-slot');
  const exit = document.getElementById('software-arcade-exit');
  const status = document.getElementById('software-arcade-status');
  const gameURL = new URL(dialog.dataset.gameUrl, location.href);
  if (gameURL.origin !== location.origin) return;
  let frame = null, generation = 0, open = false, closing = false, restoreFocus = null, scrollState = null;
  const listeners = new AbortController();
  const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: listeners.signal });

  function notify(name) { document.dispatchEvent(new CustomEvent(name)); }
  function lockScroll() {
    const body = document.body, root = document.documentElement;
    const keys = ['position', 'top', 'left', 'width', 'overflow', 'paddingRight'];
    scrollState = { x: window.scrollX, y: window.scrollY, body: {}, overflow: root.style.overflow };
    for (const key of keys) scrollState.body[key] = body.style[key];
    const scrollbar = Math.max(0, innerWidth - root.clientWidth);
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.position = 'fixed'; body.style.top = `${-scrollState.y}px`; body.style.left = `${-scrollState.x}px`;
    body.style.width = '100%'; body.style.overflow = 'hidden';
    if (scrollbar) body.style.paddingRight = `${padding + scrollbar}px`;
    root.style.overflow = 'hidden';
  }
  function unlockScroll() {
    if (!scrollState) return;
    const previous = scrollState; scrollState = null;
    for (const [key, value] of Object.entries(previous.body)) document.body.style[key] = value;
    document.documentElement.style.overflow = previous.overflow;
    window.scrollTo({ left: previous.x, top: previous.y, behavior: 'instant' });
  }
  function child() {
    try { return frame?.contentWindow?.anglerfishArcade || null; } catch (_) { return null; }
  }
  function suspend() {
    // Actual game blur pauses and releases keyboard/pointer input, and silences
    // an in-progress death. No synthetic engine state replaces those handlers.
    try { frame?.contentWindow?.dispatchEvent(new Event('blur')); } catch (_) {}
  }
  function stopFrame() {
    if (!frame) return;
    const current = frame;
    try {
      current.contentDocument?.addEventListener('anglerfish-arcade:exit', event => event.preventDefault(), { once: true, capture: true });
      const api = child();
      if (api) api.exit();
      else current.contentWindow?.dispatchEvent(new Event('pagehide'));
    } catch (_) {}
    // Destroying the browsing context also cancels an unfinished navigation.
    current.remove(); frame = null;
  }
  function closeGame() {
    if (!open || closing) return;
    closing = true; open = false; generation++;
    stopFrame();
    if (dialog.open) dialog.close();
    unlockScroll(); notify('software:game-close');
    if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
    restoreFocus = null; closing = false;
  }
  function openGame(event) {
    if (open || closing) return;
    restoreFocus = event.target instanceof HTMLElement ? event.target.closest('button,a,[tabindex]') || document.activeElement : document.activeElement;
    open = true; const token = ++generation;
    lockScroll(); status.textContent = 'Preparing the arcade…'; status.hidden = false;
    try { dialog.showModal(); } catch (_) { open = false; unlockScroll(); return; }
    notify('software:game-open');
    const current = document.createElement('iframe');
    current.title = 'Angry Anglerfish arcade';
    current.setAttribute('aria-label', 'Angry Anglerfish arcade. Exit Game remains available above the cabinet.');
    current.src = gameURL.href; frame = current;
    current.addEventListener('load', () => {
      if (!open || token !== generation || frame !== current) return;
      try {
        current.contentDocument.addEventListener('anglerfish-arcade:exit', event => {
          event.preventDefault();
          if (open && frame === current && token === generation) closeGame();
        });
        if (!child()) { status.textContent = 'The arcade could not load. Exit Game returns to Software.'; return; }
        status.hidden = true;
        if (document.hidden) suspend();
      } catch (_) { status.textContent = 'The arcade could not load. Exit Game returns to Software.'; }
    });
    slot.append(current); exit.focus({ preventScroll: true });
  }
  listen(document, 'software:open-game', openGame);
  listen(exit, 'click', closeGame);
  listen(dialog, 'close', () => { if (!dialog.open) closeGame(); });
  listen(dialog, 'cancel', event => {
    event.preventDefault();
    // Outside the frame Escape closes the host. Inside, its own Escape remains
    // pause/resume and must not destroy the visitor's round.
    if (document.activeElement !== frame) closeGame();
  });
  listen(document, 'visibilitychange', () => { if (open && document.hidden) suspend(); });
  // Keep host controls alive on a back-forward-cache return. Removed frames
  // never return, and this page has no audio sources or animation timers.
  listen(window, 'pagehide', closeGame);
  window.softwareArcadeHost = Object.freeze({ get open() { return open; }, get frame() { return frame; }, close: closeGame });
})();
