/* Local personal best only. Not a verified score or worldwide leaderboard. */
(() => {
  'use strict';
  class ArcadeScores {
    static KEY = 'anoplogaster.anglerfish-arcade.personal-best.v1';
    static valid(score) { return Number.isSafeInteger(score) && score >= 0 && score <= 999999999; }
    constructor() {
      this.best = 0; this.available = true; this.storage = null;
      try { this.storage = window.localStorage; this.refresh(); }
      catch { this.available = false; }
    }
    refresh() {
      if (!this.storage) return this.best;
      try {
        const raw = this.storage.getItem(ArcadeScores.KEY);
        if (raw === null) return this.best;
        let record;
        try { record = JSON.parse(raw); } catch { record = null; }
        if (!record || record.version !== 1 || !ArcadeScores.valid(record.score)) {
          this.storage.removeItem(ArcadeScores.KEY); // Only this game's invalid record.
          return this.best;
        }
        this.best = Math.max(this.best, record.score);
      } catch { this.available = false; }
      return this.best;
    }
    record(score) {
      if (!ArcadeScores.valid(score)) return false;
      this.refresh();
      if (score <= this.best) return false;
      this.best = score;
      try {
        if (!this.storage) throw new Error('Storage unavailable');
        this.storage.setItem(ArcadeScores.KEY, JSON.stringify({ version: 1, score }));
      } catch { this.available = false; }
      return true;
    }
  }
  window.ArcadeScores = ArcadeScores;
})();
