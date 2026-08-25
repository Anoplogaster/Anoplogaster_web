(() => {
  const portfolio = document.querySelector('[data-photography-portfolio]');
  if (!portfolio) return;

  const stream = portfolio.querySelector('[data-photo-stream]');
  const sourceTemplate = portfolio.querySelector('[data-photo-source]');
  const dialog = portfolio.querySelector('[data-lightbox]');
  const lightboxImage = dialog.querySelector('[data-lightbox-image]');
  const caption = dialog.querySelector('[data-lightbox-caption]');
  const closeButton = dialog.querySelector('[data-lightbox-close]');
  const previousButton = dialog.querySelector('[data-lightbox-prev]');
  const nextButton = dialog.querySelector('[data-lightbox-next]');
  let photos = [];
  let currentIndex = 0;
  let returnFocus = null;
  let touchStartX = null;

  const random = () => {
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      globalThis.crypto.getRandomValues(value);
      return value[0] / 4294967296;
    }
    return Math.random();
  };

  const shuffle = (items) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  };

  const prepareCard = (card, groupType) => {
    const image = card.querySelector('img');
    const sizes = {
      hero: '(max-width: 1200px) 94vw, 1120px',
      wide: '(max-width: 1200px) 94vw, 1120px',
      large: '(max-width: 1200px) 88vw, 960px',
      pair: '(max-width: 720px) 94vw, (max-width: 1200px) 46vw, 520px',
      trio: '(max-width: 720px) 94vw, (max-width: 1200px) 30vw, 350px',
    };
    image.sizes = sizes[groupType] || sizes.pair;
    image.loading = groupType === 'hero' ? 'eager' : 'lazy';
    if (groupType === 'hero') image.fetchPriority = 'high';
  };

  const createGroup = (type, cards, groupIndex) => {
    const group = document.createElement('div');
    group.className = `photography-group photography-group-${type}`;
    if (type === 'large') {
      group.classList.add(groupIndex % 8 === 4 ? 'photography-align-start' : 'photography-align-end');
    }
    if (type === 'pair' && cards.every((card) => card.dataset.orientation === 'portrait')) {
      group.classList.add('photography-group-portraits');
    }
    cards.forEach((card) => {
      prepareCard(card, type);
      group.append(card);
    });
    stream.append(group);
  };

  const takePreferred = (pool, count, preferredOrientations = []) => {
    const selected = [];
    while (selected.length < count && pool.length) {
      let index = preferredOrientations.length
        ? pool.findIndex((card) => preferredOrientations.includes(card.dataset.orientation))
        : 0;
      if (index < 0) index = 0;
      selected.push(pool.splice(index, 1)[0]);
    }
    return selected;
  };

  const buildStream = () => {
    const cards = Array.from(sourceTemplate.content.querySelectorAll('[data-photo-card]'));
    if (!cards.length) return;

    const candidates = cards.filter((card) => (
      card.dataset.featureCandidate === 'true' && card.dataset.orientation === 'landscape'
    ));
    let previousFeature = '';
    try {
      previousFeature = sessionStorage.getItem('photography-last-feature') || '';
    } catch (_) {
      previousFeature = '';
    }
    const freshCandidates = candidates.filter((card) => card.dataset.file !== previousFeature);
    const featurePool = freshCandidates.length ? freshCandidates : candidates;
    const feature = shuffle([...featurePool])[0] || cards[0];

    try {
      sessionStorage.setItem('photography-last-feature', feature.dataset.file);
    } catch (_) {
      // Randomization still works when session storage is unavailable.
    }

    stream.replaceChildren();
    feature.classList.add('photography-card-feature');
    createGroup('hero', [feature], 0);

    const pool = shuffle(cards.filter((card) => card !== feature));
    const pattern = ['pair', 'wide', 'trio', 'large'];
    let groupIndex = 1;

    while (pool.length) {
      const type = pattern[(groupIndex - 1) % pattern.length];
      let selected;
      if (type === 'wide' || type === 'large') {
        selected = takePreferred(pool, 1, ['landscape', 'square']);
      } else if (type === 'pair') {
        const portraitCount = pool.filter((card) => card.dataset.orientation === 'portrait').length;
        const usePortraitPair = portraitCount >= 2 && random() < 0.35;
        selected = takePreferred(
          pool,
          Math.min(2, pool.length),
          usePortraitPair ? ['portrait'] : ['landscape', 'square'],
        );
      } else {
        selected = takePreferred(pool, Math.min(3, pool.length));
      }
      createGroup(type, selected, groupIndex);
      groupIndex += 1;
    }

    photos = Array.from(stream.querySelectorAll('[data-photo]'));
    stream.setAttribute('data-ready', '');
  };

  try {
    buildStream();
  } catch (error) {
    const fallbackCards = Array.from(sourceTemplate.content.querySelectorAll('[data-photo-card]'));
    fallbackCards.forEach((card, index) => createGroup(index === 0 ? 'hero' : 'wide', [card], index));
    photos = Array.from(stream.querySelectorAll('[data-photo]'));
    stream.setAttribute('data-ready', '');
    console.error('Photography layout fallback used:', error);
  }

  const setCaption = (photo) => {
    caption.replaceChildren();
    const common = photo.dataset.common;
    const scientific = photo.dataset.scientific;
    const detail = photo.dataset.detail;

    if (common) caption.append(document.createTextNode(common));
    if (common && scientific) caption.append(document.createTextNode(' · '));
    if (scientific) {
      const scientificName = document.createElement('em');
      scientificName.textContent = scientific;
      caption.append(scientificName);
    }
    if (detail) {
      const specimen = document.createElement('small');
      specimen.textContent = detail;
      caption.append(specimen);
    }
  };

  const showPhoto = (index) => {
    currentIndex = (index + photos.length) % photos.length;
    const photo = photos[currentIndex];
    lightboxImage.src = photo.dataset.full;
    lightboxImage.alt = photo.dataset.alt;
    setCaption(photo);
  };

  const openLightbox = (index, trigger) => {
    returnFocus = trigger;
    showPhoto(index);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    closeButton.focus();
  };

  const closeLightbox = () => {
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };

  stream.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-photo]');
    if (!trigger) return;
    openLightbox(photos.indexOf(trigger), trigger);
  });

  closeButton.addEventListener('click', closeLightbox);
  previousButton.addEventListener('click', () => showPhoto(currentIndex - 1));
  nextButton.addEventListener('click', () => showPhoto(currentIndex + 1));

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPhoto(currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(currentIndex + 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    }
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeLightbox();
  });

  dialog.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.screenX ?? null;
  }, { passive: true });

  dialog.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const distance = (event.changedTouches[0]?.screenX ?? touchStartX) - touchStartX;
    if (Math.abs(distance) > 50) showPhoto(currentIndex + (distance < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });

  dialog.addEventListener('close', () => {
    lightboxImage.removeAttribute('src');
    returnFocus?.focus();
  });
})();
