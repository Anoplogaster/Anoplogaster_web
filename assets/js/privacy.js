/* First-party basic consent: do not request any Google code before opt-in. */
(() => {
  'use strict';
  const config = document.getElementById('site-privacy-script');
  const measurement = config?.dataset.analyticsId || '';
  if (!/^G-[A-Z0-9]+$/.test(measurement)) return;
  const key = 'anoplogaster.privacy.analytics.v1';
  const disableKey = 'ga-disable-' + measurement;
  const dialog = document.getElementById('privacy-preferences');
  const prompts = document.querySelectorAll('[data-privacy-prompt]');
  const statuses = document.querySelectorAll('[data-privacy-status]');
  let tagRequested = false, storageUnavailable = false, returnFocus = null;
  let choice = null;

  function savedChoice() {
    try {
      const value = localStorage.getItem(key);
      return value === 'granted' || value === 'denied' ? value : null;
    } catch (_) { storageUnavailable = true; return null; }
  }
  function remember(value) {
    try { localStorage.setItem(key, value); return true; }
    catch (_) {
      storageUnavailable = true;
      // A full store may reject writes while still allowing removal. Avoid
      // leaving a stale grant that could reactivate Analytics on the next page.
      if (value === 'denied') {
        try { localStorage.removeItem(key); return true; } catch (_) {}
      }
      return false;
    }
  }
  function render() {
    document.documentElement.dataset.analyticsConsent = choice || 'unset';
    prompts.forEach(element => { element.hidden = choice !== null; });
    let message = choice === 'granted' ? 'Optional Analytics: allowed.' :
      choice === 'denied' ? 'Optional Analytics: declined.' : 'Optional Analytics is off. No preference saved yet.';
    if (storageUnavailable) message += ' This browser could not save your preference; it applies to this page only.';
    statuses.forEach(element => { element.textContent = message; });
  }
  function clearAnalyticsCookies() {
    // Only this site's two Google Analytics cookie names; never game storage.
    const expire = cookie => {
      // Cookie access itself can throw when browser storage is restricted.
      // A failed expiry must not interrupt disabling Analytics or reloading.
      try { document.cookie = cookie; } catch (_) {}
    };
    const names = ['_ga', '_ga_' + measurement.slice(2)];
    const host = location.hostname;
    const domains = [];
    if (host.includes('.') && !/^\d+(?:\.\d+){3}$/.test(host)) {
      const labels = host.split('.');
      for (let i = 0; i < labels.length - 1; i++) domains.push(labels.slice(i).join('.'));
    }
    for (const name of names) {
      const expired = name + '=; Max-Age=0; Path=/; SameSite=Lax';
      expire(expired);
      for (const domain of domains) expire(expired + '; Domain=' + domain);
    }
  }
  function loadAnalytics() {
    if (choice !== 'granted' || tagRequested) return;
    tagRequested = true;
    window[disableKey] = false;
    const layer = window.dataLayer = window.dataLayer || [];
    const gtag = window.gtag = function () { layer.push(arguments); };
    // These commands are queued locally, and only after explicit/saved opt-in.
    gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    gtag('consent', 'update', {analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    let referrer = '';
    try { if (document.referrer) referrer = new URL(document.referrer).origin + '/'; } catch (_) {}
    gtag('js', new Date());
    gtag('config', measurement, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: referrer,
      cookie_flags: 'SameSite=Lax;Secure',
      cookie_expires: 2592000,
      cookie_update: false
    });
    const tag = document.createElement('script');
    tag.id = 'google-analytics-tag';
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurement);
    tag.addEventListener('error', () => {
      if (choice === 'granted') statuses.forEach(element => { element.textContent = 'Optional Analytics is allowed, but the tag could not load. The website still works.'; });
    });
    document.head.appendChild(tag);
  }
  function closePreferences() {
    if (dialog?.open) dialog.close();
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    returnFocus = null;
  }
  function apply(value, persist = true) {
    if (value !== 'granted' && value !== 'denied' && value !== null) return;
    choice = value;
    if (persist && value !== null) remember(value);
    window[disableKey] = value !== 'granted';
    render();
    closePreferences();
    if (value === 'granted') loadAnalytics();
    else {
      clearAnalyticsCookies();
      if (tagRequested) {
        // Removing a script element cannot unload its code. Disable sending
        // immediately, then reload so the next document contains no Google tag.
        document.getElementById('google-analytics-tag')?.remove();
        // If storage has become entirely read-only, reloading could restore an
        // old grant. Keep sending disabled in this document in that case.
        if (savedChoice() !== 'granted') location.reload();
        else statuses.forEach(element => {
          element.textContent = 'Analytics is disabled on this page. This browser could not replace the previously saved permission; other pages may still use it. Please clear this site’s saved privacy preference in your browser.';
        });
      }
    }
  }

  window[disableKey] = true;
  document.querySelectorAll('[data-privacy-open]').forEach(button => { button.hidden = false; });
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const action = event.target.closest('[data-privacy-choice]');
    if (action) {
      if (!dialog?.open) returnFocus = document.querySelector('[data-privacy-open]');
      apply(action.dataset.privacyChoice);
      return;
    }
    const opener = event.target.closest('[data-privacy-open]');
    if (opener && dialog) {
      returnFocus = opener;
      if (!dialog.open) dialog.showModal();
      dialog.querySelector('[data-privacy-choice="denied"]')?.focus();
    } else if (event.target.closest('[data-privacy-close]')) closePreferences();
  });
  dialog?.addEventListener('cancel', event => { event.preventDefault(); closePreferences(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(savedChoice(), false);
  });
  apply(savedChoice(), false);
})();
