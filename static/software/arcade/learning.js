/* Reusable discovery state and immediate event-driven lessons. No simulation, scoring,
 * artwork or audio logic lives here; the host owns pause/resume and the UI. */
(() => {
  'use strict';
  const KEY = 'anoplogaster.anglerfish-arcade.learning.v1';
  const FOOD = new Set(['lanternfish', 'krill', 'chaetognath', 'amphipod', 'squid', 'bristlemouth', 'hatchetfish']);
  const MALES = { 1: 'mate', 2: 'reproductive-modes', 3: 'fusion', 4: 'immunity' };
  class ArcadeLearning {
    static STORAGE_KEY = KEY;
    constructor({ curriculum, storage, onLesson = () => {}, onCloseLesson = () => {}, onChange = () => {} }) {
      this.curriculum = curriculum;
      this.lessons = new Map(curriculum.lessons.map(lesson => [lesson.id, lesson]));
      this.enabled = true;
      this.collectionIds = new Set();
      this.choicePresented = false;
      this.storageAvailable = true;
      this.storage = null;
      this.onLesson = onLesson;
      this.onCloseLesson = onCloseLesson;
      this.onChange = onChange;
      this.activeLesson = null;
      this.reviewOpen = false;
      this.gameDiscoveries = new Set();
      // One nomination for the current atomic simulation step, never a FIFO.
      // tick() always consumes or discards it before returning.
      this.pendingLesson = null;
      this.seen = new Set();
      this.promptVisible = false;
      this.completed = false;
      this.started = false;
      try {
        this.storage = storage === undefined ? window.localStorage : storage;
        if (!this.storage) throw new Error('Storage unavailable');
        const raw = this.storage.getItem(KEY);
        if (raw) {
          let record;
          try { record = JSON.parse(raw); } catch (_) { record = null; }
          if (record && record.version === 1) {
            if (typeof record.enabled === 'boolean') this.enabled = record.enabled;
            this.choicePresented = record.choicePresented === true;
            if (Array.isArray(record.discoveries)) for (const id of record.discoveries) {
              if (this.lessons.has(id)) this.collectionIds.add(id);
            }
          }
        }
      } catch (_) { this.storageAvailable = false; this.storage = null; }
    }
    get count() { return this.collectionIds.size; }
    get blocked() { return Boolean(this.activeLesson || this.reviewOpen); }
    get resultsReady() { return this.completed && !this.activeLesson; }
    save() {
      try {
        if (!this.storage) throw new Error('Storage unavailable');
        this.storage.setItem(KEY, JSON.stringify({ version: 1, enabled: this.enabled,
          discoveries: [...this.collectionIds], choicePresented: this.choicePresented }));
        this.storageAvailable = true;
      } catch (_) { this.storageAvailable = false; }
    }
    beginGame() {
      this.started = true;
      this.completed = false;
      this.promptVisible = false;
      this.gameDiscoveries = new Set();
      this.seen = new Set();
      this.pendingLesson = null;
      this.activeLesson = null;
      this.discover('meet');
      this.onChange();
    }
    discover(id) {
      if (!this.enabled || !this.started || this.completed || this.seen.has(id) || !this.lessons.has(id)) return false;
      this.seen.add(id);
      this.gameDiscoveries.add(id);
      const previouslyCollected = this.collectionIds.has(id);
      this.collectionIds.add(id);
      // Lifetime-known entries still record this dive's actual event order,
      // but never interrupt again. Other new same-step entries remain in the
      // collection/review only; closing a panel cannot drain later lessons.
      if (!previouslyCollected && !this.blocked && !this.pendingLesson) this.pendingLesson = this.lessons.get(id);
      this.save();
      this.onChange();
      return true;
    }
    handleEvent(event) {
      if (event.type === 'start') this.beginGame();
      else if (event.type === 'lureOn') this.discover('lure');
      else if (event.type === 'eat' && FOOD.has(event.kind)) this.discover(event.kind);
      else if (event.type === 'attach' && MALES[event.count]) this.discover(MALES[event.count]);
      else if (event.type === 'damage' && (event.kind === 'lancetfish' || event.kind === 'atolla' || event.kind === 'spermwhale')) this.discover(event.kind);
    }
    tick(engine) {
      const candidate = this.pendingLesson;
      this.pendingLesson = null;
      if (engine.state === 'over') { this.finishGame(); return; }
      // A fatal collision is recorded, but its lesson must not stop the death
      // animation. Only decomposition may interrupt after the over event.
      if (engine.state !== 'playing' || this.blocked || !this.enabled) return;
      if (!candidate) return;
      this.activeLesson = candidate;
      this.onLesson(this.activeLesson);
      this.onChange();
    }
    closeLesson(reason = 'continue') {
      if (!this.activeLesson) return false;
      this.activeLesson = null;
      this.pendingLesson = null;
      this._presentResults();
      this.onCloseLesson(reason);
      this.onChange();
      return true;
    }
    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.save();
      // Disabling dismisses the current panel without losing the collection.
      // Enabling mid-dive responds only to FUTURE actual gameplay events.
      if (!this.enabled) { this.pendingLesson = null; this.closeLesson('disabled'); }
      this.onChange();
    }
    finishGame() {
      if (!this.started || this.completed) return;
      // Over supersedes a fatal-step nomination. Nominate only decomposition,
      // after the host has completed the existing death animation.
      this.pendingLesson = null;
      this.discover('decomposition');
      const candidate = this.pendingLesson;
      this.pendingLesson = null;
      this.completed = true;
      if (candidate && !this.blocked && this.enabled) {
        this.activeLesson = candidate;
        this.onLesson(this.activeLesson);
      }
      this._presentResults();
      this.save();
      this.onChange();
    }
    _presentResults() {
      if (!this.resultsReady) return;
      if (!this.choicePresented) {
        this.choicePresented = true;
        this.promptVisible = true;
        this.save();
      }
    }
    chooseExperience(enabled) {
      this.promptVisible = false;
      this.setEnabled(enabled);
      // The host's existing Replay button, not this choice, starts a new dive.
    }
    openReview() {
      if (this.activeLesson || this.reviewOpen) return false;
      this.reviewOpen = true;
      this.onChange();
      return true;
    }
    closeReview() { this.reviewOpen = false; this.onChange(); }
    destroy() {
      this.activeLesson = null;
      this.reviewOpen = false;
      this.pendingLesson = null;
      this.onLesson = this.onCloseLesson = this.onChange = () => {};
    }
  }
  window.ArcadeLearning = ArcadeLearning;
})();
