(() => {
  const portfolio = document.querySelector('[data-photography-portfolio]');
  if (!portfolio) return;
  const stream = portfolio.querySelector('[data-photo-stream]');
  const dialog = portfolio.querySelector('[data-lightbox]');
  // Unsupported/disabled JavaScript leaves all original-file anchors usable.
  if (!stream || !dialog || typeof dialog.showModal !== 'function') return;
  const photos = Array.from(stream.querySelectorAll('a[data-photo]'));
  if (!photos.length) return;
  photos.forEach(photo => {
    photo.setAttribute('aria-haspopup', 'dialog');
    photo.setAttribute('aria-controls', dialog.id);
  });
  const image = dialog.querySelector('[data-lightbox-image]');
  const caption = dialog.querySelector('[data-lightbox-caption]');
  const counter = dialog.querySelector('[data-lightbox-counter]');
  const original = dialog.querySelector('[data-lightbox-original]');
  const closeButton = dialog.querySelector('[data-lightbox-close]');
  const previousButton = dialog.querySelector('[data-lightbox-prev]');
  const nextButton = dialog.querySelector('[data-lightbox-next]');
  const playButton = dialog.querySelector('[data-lightbox-play]');
  const stage = dialog.querySelector('[data-lightbox-stage]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const adjacentImage = new Image(); // One adjacent image, never the full collection.
  adjacentImage.decoding = 'async';
  let currentIndex = 0;
  let revision = 0;
  let returnFocus = null;
  let returnScroll = { x: 0, y: 0 };
  let touch = null;
  let slideshow = false;
  let slideshowTimer = null;
  const interval = 5500;

  function cancelTimer() {
    if (slideshowTimer !== null) window.clearTimeout(slideshowTimer);
    slideshowTimer = null;
  }

  function synchronizePlay() {
    playButton.textContent = slideshow ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(slideshow));
    playButton.disabled = reducedMotion.matches;
    playButton.setAttribute('aria-label', reducedMotion.matches
      ? 'Slideshow unavailable with reduced motion'
      : slideshow ? 'Pause slideshow' : 'Play slideshow');
    dialog.dataset.slideshow = slideshow ? 'playing' : 'paused';
  }

  function pauseSlideshow() {
    slideshow = false;
    cancelTimer();
    synchronizePlay();
  }

  function scheduleAdvance() {
    cancelTimer();
    if (!slideshow || !dialog.open || document.hidden || reducedMotion.matches || dialog.dataset.loading === 'true') return;
    slideshowTimer = window.setTimeout(() => {
      slideshowTimer = null;
      if (slideshow && dialog.open && !document.hidden && !reducedMotion.matches) showPhoto(currentIndex + 1);
    }, interval);
  }

  function imageSize(photo) {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const ratio = Number(photo.dataset.fullWidth) / Number(photo.dataset.fullHeight);
    // Match the contain-only stage rather than fetching a full-width portrait.
    return `${Math.max(1, Math.floor(Math.min(width - 32, (height - 176) * ratio)))}px`;
  }

  function setCaption(photo) {
    caption.replaceChildren();
    if (photo.dataset.common) caption.append(document.createTextNode(photo.dataset.common));
    if (photo.dataset.common && photo.dataset.scientific) caption.append(document.createTextNode(' · '));
    if (photo.dataset.scientific) {
      const name = document.createElement('em');
      name.textContent = photo.dataset.scientific;
      caption.append(name);
    }
    if (photo.dataset.detail) {
      const detail = document.createElement('small');
      detail.textContent = photo.dataset.detail;
      caption.append(detail);
    }
    caption.hidden = !caption.childNodes.length;
  }

  function preloadAdjacent() {
    if (!dialog.open || document.hidden || photos.length < 2) return;
    const photo = photos[(currentIndex + 1) % photos.length];
    adjacentImage.sizes = imageSize(photo);
    adjacentImage.srcset = photo.dataset.viewerSet;
    adjacentImage.src = photo.dataset.full;
  }

  async function showPhoto(index) {
    cancelTimer();
    currentIndex = (index + photos.length) % photos.length;
    const photo = photos[currentIndex];
    const request = ++revision;
    dialog.dataset.currentIndex = String(currentIndex);
    dialog.dataset.loading = 'true';
    stage.setAttribute('aria-busy', 'true');
    image.style.visibility = 'hidden';
    counter.textContent = `${currentIndex + 1} / ${photos.length}`;
    counter.setAttribute('aria-label', `Photograph ${currentIndex + 1} of ${photos.length}`);
    original.href = photo.dataset.original;
    image.alt = photo.dataset.alt;
    image.width = Number(photo.dataset.fullWidth);
    image.height = Number(photo.dataset.fullHeight);
    image.sizes = imageSize(photo);
    image.srcset = photo.dataset.viewerSet;
    image.src = photo.dataset.full;
    setCaption(photo);
    try {
      if (image.decode) await image.decode();
      else if (!image.complete) await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', reject, { once: true });
      });
    } catch (_) {
      // The original link remains available if a derivative cannot be loaded.
    }
    if (request !== revision || !dialog.open) return;
    image.style.visibility = '';
    dialog.dataset.loading = 'false';
    stage.setAttribute('aria-busy', 'false');
    preloadAdjacent();
    scheduleAdvance();
  }

  function openLightbox(index, trigger) {
    pauseSlideshow();
    returnFocus = trigger;
    returnScroll = { x: window.scrollX, y: window.scrollY };
    dialog.showModal();
    showPhoto(index);
    closeButton.focus({ preventScroll: true });
  }

  function closeLightbox() {
    pauseSlideshow();
    if (dialog.open) dialog.close();
  }

  function navigate(delta) {
    pauseSlideshow();
    showPhoto(currentIndex + delta);
  }

  stream.addEventListener('click', event => {
    const trigger = event.target.closest('a[data-photo]');
    if (!trigger || !stream.contains(trigger) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const index = photos.indexOf(trigger);
    if (index < 0) return;
    event.preventDefault();
    openLightbox(index, trigger);
  });
  closeButton.addEventListener('click', closeLightbox);
  previousButton.addEventListener('click', () => navigate(-1));
  nextButton.addEventListener('click', () => navigate(1));
  playButton.addEventListener('click', () => {
    if (reducedMotion.matches || document.hidden) return;
    slideshow = !slideshow;
    synchronizePlay();
    scheduleAdvance();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('cancel', pauseSlideshow); // Escape uses native dismissal.
  dialog.addEventListener('close', () => {
    pauseSlideshow();
    revision += 1;
    touch = null;
    image.removeAttribute('srcset');
    image.removeAttribute('src');
    adjacentImage.removeAttribute('srcset');
    adjacentImage.removeAttribute('src');
    dialog.dataset.loading = 'false';
    stage.setAttribute('aria-busy', 'false');
    returnFocus?.focus({ preventScroll: true });
    window.scrollTo({ left: returnScroll.x, top: returnScroll.y, behavior: 'instant' });
    returnFocus = null;
  });

  // Passive gestures never cancel vertical scrolling or browser pinch zoom.
  const isZoomed = () => Math.abs((window.visualViewport?.scale || 1) - 1) > 0.05;
  stage.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || isZoomed()) { touch = null; return; }
    const point = event.touches[0];
    touch = { id: point.identifier, x: point.clientX, y: point.clientY, time: performance.now() };
  }, { passive: true });
  stage.addEventListener('touchmove', event => {
    if (event.touches.length !== 1 || isZoomed()) touch = null;
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
  stage.addEventListener('touchend', event => {
    const start = touch;
    touch = null;
    if (!start || event.touches.length || isZoomed()) return;
    const point = Array.from(event.changedTouches).find(value => value.identifier === start.id);
    if (!point) return;
    const x = point.clientX - start.x;
    const y = point.clientY - start.y;
    if (Math.abs(x) >= 60 && Math.abs(x) > Math.abs(y) * 1.8 && Math.abs(y) < 80 && performance.now() - start.time < 1000) navigate(x < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseSlideshow();
      adjacentImage.removeAttribute('srcset');
      adjacentImage.removeAttribute('src');
    }
  });
  const onMotionChange = () => { if (reducedMotion.matches) pauseSlideshow(); else synchronizePlay(); };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
  else reducedMotion.addListener(onMotionChange);
  window.addEventListener('resize', () => {
    if (!dialog.open) return;
    image.sizes = imageSize(photos[currentIndex]);
  }, { passive: true });
  synchronizePlay();
})();
