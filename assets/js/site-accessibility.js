/* Accessibility for the existing Hugo navbar; no game or gallery state here. */
(() => {
  'use strict';
  const init = () => {
    const toggle = document.getElementById('nav-menu-toggle');
    const checkbox = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    const header = document.querySelector('.page-header');
    const nav = document.querySelector('#site-header nav');
    if (!toggle || !checkbox || !menu || !header || !nav) return;
    const narrow = matchMedia('(max-width: 1023px)');
    const updatePadding = () => {
      const height = header.getBoundingClientRect().height;
      document.documentElement.style.scrollPaddingTop = height + 'px';
      document.documentElement.style.setProperty('--navbar-height', height + 'px');
    };
    const setOpen = (open, restoreFocus = false) => {
      checkbox.checked = Boolean(open && narrow.matches);
      toggle.setAttribute('aria-expanded', String(checkbox.checked));
      toggle.setAttribute('aria-label', checkbox.checked ? 'Close navigation menu' : 'Open navigation menu');
      header.dataset.menuOpen = String(checkbox.checked);
      updatePadding();
      if (restoreFocus) toggle.focus({preventScroll: true});
    };
    toggle.addEventListener('click', () => setOpen(!checkbox.checked));
    checkbox.addEventListener('change', () => setOpen(checkbox.checked));
    nav.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !checkbox.checked) return;
      event.preventDefault();
      setOpen(false, true);
    });
    menu.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
    });
    nav.addEventListener('focusout', event => {
      if (checkbox.checked && event.relatedTarget && !nav.contains(event.relatedTarget)) setOpen(false);
    });
    narrow.addEventListener('change', () => {
      const wasToggle = document.activeElement === toggle;
      setOpen(false);
      if (wasToggle && !narrow.matches) nav.querySelector('.navbar-brand')?.focus({preventScroll: true});
    });
    document.querySelector('.site-skip-link')?.addEventListener('click', () => {
      setOpen(false);
      document.getElementById('main-content')?.focus({preventScroll: true});
    });
    window.addEventListener('resize', updatePadding);
    setOpen(false);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
