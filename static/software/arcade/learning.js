/* Reusable discovery state and lesson scheduler. No simulation, scoring,
 * artwork or audio logic lives here; the host owns pause/resume and the UI. */
(() => {
  'use strict';
  const KEY = 'anoplogaster.anglerfish-arcade.learning.v1';
  const INTERVAL = 20;
  const FOOD = new Set(['lanternfish', 'krill', 'chaetognath', 'amphipod', 'squid', 'bristlemouth', 'hatchetfish']);
  const MALES = { 1: 'mate', 2: 'reproductive-modes', 3: 'fusion', 4: 'immunity' };
  class ArcadeLearning {
    static STORAGE_KEY = KEY;
    static INTERVAL = INTERVAL;
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
      this.queuedIds = [];
      this.seen = new Set();
      this.lastPanelAt = -Infinity;
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
      this.queuedIds = [];
      this.activeLesson = null;
      this.lastPanelAt = -Infinity;
      this.discover('meet');
      this.onChange();
    }
    discover(id) {
      if (!this.enabled || !this.started || this.completed || this.seen.has(id) || !this.lessons.has(id)) return false;
      this.seen.add(id);
      this.gameDiscoveries.add(id);
      this.collectionIds.add(id);
      this.queuedIds.push(id);
      this.save();
      this.onChange();
      return true;
    }
    handleEvent(event) {
      if (event.type === 'start') this.beginGame();
      else if (event.type === 'lureOn') this.discover('lure');
      else if (event.type === 'eat' && FOOD.has(event.kind)) this.discover(event.kind);
      else if (event.type === 'attach' && MALES[event.count]) this.discover(MALES[event.count]);
    }
    tick(engine) {
      if (engine.state === 'over') { this.finishGame(); return; }
      if (engine.state !== 'playing' || this.blocked || !this.enabled) return;
      // Encounter means visible in the field, not a hidden off-screen spawn.
      for (const enemy of engine.enemies) {
        if (enemy.x - enemy.w / 2 <= 1200 && enemy.x + enemy.w / 2 >= 0
          && (enemy.kind === 'lancetfish' || enemy.kind === 'atolla')) this.discover(enemy.kind);
      }
      if (!this.queuedIds.length || engine.time - this.lastPanelAt < INTERVAL - 1e-8) return;
      this.activeLesson = this.lessons.get(this.queuedIds.shift());
      this.lastPanelAt = engine.time;
      this.onLesson(this.activeLesson);
      this.onChange();
    }
    closeLesson(reason = 'continue') {
      if (!this.activeLesson) return false;
      this.activeLesson = null;
      this.onCloseLesson(reason);
      this.onChange();
      return true;
    }
    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.save();
      // Disabling is a deliberate dismissal, never discarding discoveries or
      // pending review material. Re-enabling does not reset the spacing clock.
      if (!this.enabled) this.closeLesson('disabled');
      else if (this.started && !this.completed) this.discover('meet');
      this.onChange();
    }
    finishGame() {
      if (!this.started || this.completed) return;
      this.discover('decomposition');
      this.completed = true;
      if (!this.choicePresented) {
        this.choicePresented = true;
        this.promptVisible = true;
      }
      this.save();
      this.onChange();
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
      this.queuedIds = [];
      this.onLesson = this.onCloseLesson = this.onChange = () => {};
    }
  }
  window.ArcadeLearning = ArcadeLearning;
})();
