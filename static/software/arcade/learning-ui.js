/* Reusable educational DOM layer. Gameplay, clocks and persistence belong to
 * the learning controller; this interface never resumes or restarts a game. */
(function (root) {
  'use strict';
  const noop = function () {};
  const ids = value => value ? Array.from(value) : [];
  const text = (element, value) => { const next = String(value); if (element.textContent !== next) element.textContent = next; };
  const hidden = (element, value) => { if (element.hidden !== value) element.hidden = value; };
  const attribute = (element, name, value) => { const next = String(value); if (element.getAttribute(name) !== next) element.setAttribute(name, next); };

  class ArcadeLearningUI {
    constructor(options) {
      options = options || {};
      this.curriculum = options.curriculum || root.ArcadeCurriculum || { lessons: [], references: {} };
      ['onToggle', 'onCloseLesson', 'onCloseReview', 'onReview', 'onChoice'].forEach(name => { this[name] = typeof options[name] === 'function' ? options[name] : noop; });
      this.enabled = true;
      this._listeners = [];
      this._focus = new Map();
      this._lessonId = null;
      this._announcedCount = null;
      this._get = id => {
        const element = document.getElementById(id);
        if (!element) throw new Error('Learning UI element missing: ' + id);
        return element;
      };
      this.toggle = this._get('learning-toggle');
      this.counter = this._get('discovery-counter');
      this.reviewButton = this._get('discovery-review');
      this.prompt = this._get('learning-prompt');
      this.summary = this._get('learning-summary');
      this.lessonDialog = this._get('learning-lesson-dialog');
      this.reviewDialog = this._get('learning-review-dialog');
      this._listen(this.toggle, 'click', () => this.onToggle(!this.enabled));
      this._listen(this._get('learning-review-toggle'), 'click', () => this.onToggle(!this.enabled));
      [this.counter, this.reviewButton, this._get('learning-summary-review')].forEach(button => this._listen(button, 'click', () => this.onReview()));
      this._listen(this._get('learning-continue'), 'click', () => this._requestLessonClose('continue'));
      this._listen(this._get('learning-skip'), 'click', () => this._requestLessonClose('skip'));
      this._listen(this._get('learning-lesson-off'), 'click', () => { this.closeLesson(); this.onToggle(false); });
      [this._get('learning-review-close'), this._get('learning-review-done')].forEach(button => this._listen(button, 'click', () => this._requestReviewClose()));
      document.querySelectorAll('[data-learning-choice]').forEach(button => this._listen(button, 'click', () => this.onChoice(button.dataset.learningChoice === 'true')));
      this._listen(this.lessonDialog, 'cancel', event => { event.preventDefault(); event.stopPropagation(); this._requestLessonClose('skip'); });
      this._listen(this.reviewDialog, 'cancel', event => { event.preventDefault(); event.stopPropagation(); this._requestReviewClose(); });
      [this.lessonDialog, this.reviewDialog].forEach(dialog => {
        // Native modal dialogs provide the focus trap. Stop keys before the
        // game's window listeners so Escape cannot also resume the dive.
        this._listen(dialog, 'keydown', event => event.stopPropagation());
        this._listen(dialog, 'keyup', event => event.stopPropagation());
      });
    }

    _listen(target, name, listener) {
      target.addEventListener(name, listener);
      this._listeners.push(() => target.removeEventListener(name, listener));
    }

    sync(model, engineState) {
      model = model || {};
      const total = this.curriculum.lessons.length || 16;
      const count = Number.isFinite(model.count) ? model.count : ids(model.collectionIds).length;
      this.enabled = model.enabled !== false;
      const label = 'Learning Mode: ' + (this.enabled ? 'ON' : 'OFF');
      [this.toggle, this._get('learning-review-toggle')].forEach(button => { text(button, label); attribute(button, 'aria-pressed', this.enabled); });
      hidden(this._get('learning-lesson-off'), !this.enabled);
      const showCounter = this.enabled && ['playing', 'paused'].includes(engineState);
      hidden(this.counter, !showCounter);
      if (document.body.classList.contains('learning-hud-visible') !== showCounter) document.body.classList.toggle('learning-hud-visible', showCounter);
      text(this._get('discovery-count-value'), String(count).padStart(2, '0') + '/' + total);
      attribute(this.counter, 'aria-label', 'Discoveries ' + count + ' of ' + total + '. Review Discovery Collection');
      attribute(this.reviewButton, 'aria-label', 'Review Discovery Collection');
      const unavailable = model.storageAvailable === false;
      hidden(this._get('learning-storage-note'), !unavailable);
      hidden(this._get('learning-review-storage-note'), !unavailable);
      const gameCount = new Set(ids(model.gameDiscoveries)).size;
      const queuedCount = new Set(ids(model.queuedIds)).size;
      const over = ['over', 'gameover'].includes(engineState);
      hidden(this.summary, !over);
      text(this._get('learning-summary-copy'), 'This dive: ' + gameCount + (gameCount === 1 ? ' discovery' : ' discoveries') + '. Your collection: ' + count + '/' + total + '.' + (queuedCount ? ' ' + queuedCount + (queuedCount === 1 ? ' queued lesson is' : ' queued lessons are') + ' available in the review.' : ''));
      hidden(this.prompt, !(over && model.promptVisible));
      if (count !== this._announcedCount) {
        if (this._announcedCount !== null) text(this._get('learning-live-status'), 'Discovery Collection: ' + count + ' of ' + total + ' discoveries.');
        this._announcedCount = count;
      }
    }

    _openDialog(dialog, focusTarget) {
      if (dialog.open) return;
      this._focus.set(dialog, document.activeElement);
      dialog.showModal();
      document.body.classList.add('learning-modal-open');
      focusTarget.focus({ preventScroll: true });
    }

    _closeDialog(dialog) {
      if (!dialog.open) return;
      dialog.close();
      if (!this.lessonDialog.open && !this.reviewDialog.open) document.body.classList.remove('learning-modal-open');
      const prior = this._focus.get(dialog);
      this._focus.delete(dialog);
      if (prior && prior.isConnected && !prior.disabled && typeof prior.focus === 'function') prior.focus({ preventScroll: true });
    }

    _referenceLink(reference, label) {
      let url;
      try { url = new URL(reference.url, document.baseURI); } catch (_) { return document.createTextNode(label); }
      if (!['https:', 'http:'].includes(url.protocol)) return document.createTextNode(label);
      const link = document.createElement('a');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = label;
      const hint = document.createElement('span');
      hint.className = 'visually-hidden';
      hint.textContent = ' (opens in a new tab)';
      link.append(hint);
      return link;
    }

    _references(lesson, full) {
      const fragment = document.createDocumentFragment();
      const references = this.curriculum.references || {};
      const selected = [...new Set(lesson.referenceIds || [])].map(id => references[id]).filter(Boolean);
      if (full && selected.length) {
        const heading = document.createElement('h4');
        heading.textContent = 'Scientific references';
        fragment.append(heading);
      }
      selected.forEach((reference, index) => {
        if (full) {
          const paragraph = document.createElement('p');
          paragraph.append(document.createTextNode(reference.full || reference.authorYear || 'Scientific reference'));
          const link = this._referenceLink(reference, 'Published source');
          if (link.nodeType === 1) link.classList.add('learning-reference-link');
          paragraph.append(document.createTextNode(' '), link);
          fragment.append(paragraph);
        } else {
          if (index) fragment.append(document.createTextNode('; '));
          fragment.append(this._referenceLink(reference, reference.authorYear || reference.full || 'Scientific reference'));
        }
      });
      return fragment;
    }

    showLesson(lesson) {
      if (!lesson || this.reviewDialog.open) return false;
      if (this.lessonDialog.open && this._lessonId === lesson.id) return true;
      this._lessonId = lesson.id;
      text(this._get('learning-lesson-number'), String(lesson.order || '').padStart(2, '0') + '/' + (this.curriculum.lessons.length || 16));
      text(this._get('learning-lesson-title'), lesson.title);
      // Content is vetted, local curriculum HTML, never visitor input or a
      // remotely fetched document. Preserve its scientific-name italics.
      this._get('learning-lesson-body').innerHTML = lesson.html || '';
      this._get('learning-lesson-citation').replaceChildren(this._references(lesson, false));
      this._openDialog(this.lessonDialog, this._get('learning-continue'));
      return true;
    }

    closeLesson() {
      this._closeDialog(this.lessonDialog);
      this._lessonId = null;
    }

    _requestLessonClose(reason) {
      this.closeLesson();
      this.onCloseLesson(reason);
    }

    showReview(options) {
      if (this.lessonDialog.open) return false;
      options = options || {};
      const collection = new Set(ids(options.ids));
      const game = new Set(ids(options.gameIds));
      const queued = new Set(ids(options.queuedIds));
      const selected = new Set([...collection, ...game, ...queued]);
      const lessons = this.curriculum.lessons.filter(lesson => selected.has(lesson.id)).slice().sort((a, b) => a.order - b.order);
      const body = this._get('learning-review-body');
      const fragment = document.createDocumentFragment();
      text(this._get('learning-review-summary'), collection.size + '/' + (this.curriculum.lessons.length || 16) + ' collected · ' + game.size + ' discovered this dive' + (queued.size ? ' · ' + queued.size + ' queued for review' : ''));
      if (!lessons.length) {
        const paragraph = document.createElement('p');
        paragraph.className = 'learning-prose';
        paragraph.textContent = 'No discoveries yet. Enable Learning Mode and start a dive to begin your collection.';
        fragment.append(paragraph);
      }
      lessons.forEach(lesson => {
        const article = document.createElement('article');
        article.className = 'learning-review-article';
        article.dataset.learningLesson = lesson.id;
        const heading = document.createElement('h3');
        heading.textContent = String(lesson.order).padStart(2, '0') + ' · ' + lesson.title;
        article.append(heading);
        const tags = document.createElement('p');
        tags.className = 'learning-review-tags';
        if (game.has(lesson.id)) { const tag = document.createElement('span'); tag.textContent = 'Discovered this dive'; tags.append(tag); }
        if (queued.has(lesson.id)) { const tag = document.createElement('span'); tag.textContent = 'Queued lesson — available here'; tags.append(tag); }
        if (tags.childElementCount) article.append(tags);
        const explanation = document.createElement('div');
        explanation.className = 'learning-prose';
        explanation.innerHTML = lesson.html || '';
        const references = document.createElement('div');
        references.className = 'learning-full-references';
        references.append(this._references(lesson, true));
        article.append(explanation, references);
        fragment.append(article);
      });
      body.replaceChildren(fragment);
      this._openDialog(this.reviewDialog, this._get('learning-review-close'));
      return true;
    }

    closeReview() { this._closeDialog(this.reviewDialog); }

    _requestReviewClose() {
      this.closeReview();
      this.onCloseReview();
    }

    destroy() {
      this.closeLesson();
      this.closeReview();
      this._listeners.splice(0).forEach(remove => remove());
      document.body.classList.remove('learning-hud-visible', 'learning-modal-open');
    }
  }
  root.ArcadeLearningUI = ArcadeLearningUI;
})(typeof window !== 'undefined' ? window : globalThis);
