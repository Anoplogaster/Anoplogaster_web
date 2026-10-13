/* Approved Arcade Assault playback and unchanged original arcade sound effects.
 * One integer-length periodic buffer; no fetch or music scheduling timers. */
(() => {
  'use strict';

  const PREFERENCES_KEY = 'anoplogaster.anglerfish-arcade.audio-preferences.v1';
  const APPROVED_MUSIC = window.ArcadeAssaultMusic;
  if (!APPROVED_MUSIC) throw new Error('Load the approved Arcade Assault source before audio.js');
  const DESCRIPTION = APPROVED_MUSIC.METADATA;
  const DEATH = Object.freeze({
    duration: 2.2,
    layers: Object.freeze([
      Object.freeze({ type: 'triangle', start: 196, end: 49, gain: .050 }),
      Object.freeze({ type: 'sine', start: 130.8128, end: 32.7032, gain: .036 })
    ])
  });
  // These pitches, timings, and envelopes are the prototype's original SFX.
  const EFFECTS = Object.freeze({
    start: [[220, 0, .07], [330, .07, .07], [440, .14, .12]],
    eat: [[650, 0, .04], [1000, .04, .06]],
    damage: [[110, 0, .12], [70, .1, .12]],
    lureOn: [[420, 0, .06], [740, .05, .09]],
    lureOff: [[420, 0, .06], [250, .05, .07]],
    over: [[330, 0, .14], [220, .15, .14], [110, .3, .3]],
    attach: [[523.25, 0, .065], [622.25, .06, .065], [783.99, .12, .12]],
    // Original synthesized sonar-style ping and quieter returning echo.
    'whale-warning': [[784, 0, .26], [587.33, .34, .22]]
  });

  function disconnect(node) { try { node?.disconnect(); } catch (_) {} }

  function createMusicBuffer(context) {
    return APPROVED_MUSIC.createBuffer(context).buffer;
  }

  class ArcadeAudio {
    static PREFERENCES_KEY = PREFERENCES_KEY;

    constructor() {
      this.context = null;
      this.enabled = true; // Legacy property means the desired SFX preference.
      this.musicEnabled = true;
      this.musicPlaying = false;
      this.musicSource = null;
      this.musicBuffer = null;
      this.musicDescription = DESCRIPTION;
      this.deathDescription = DEATH;
      this.activeVoices = new Set();
      this.state = 'ready';
      this.destroyed = false;
      this._voiceGains = new Map();
      this._pendingEffects = [];
      this._resumePromise = null;
      this._musicRequested = false;
      this._deathPlayed = false;
      this.musicGain = null;
      this.effectsGain = null;
      this.preferencesKey = PREFERENCES_KEY;
      this.prefStorageAvailable = true;
      this._preferencesStorage = null;
      this._loadPreferences(); // Storage only: never creates or resumes audio.
    }

    _loadPreferences() {
      try {
        this._preferencesStorage = window.localStorage;
        const raw = this._preferencesStorage.getItem(PREFERENCES_KEY);
        if (raw === null) return;
        let record;
        try { record = JSON.parse(raw); } catch (_) { record = null; }
        if (record && !Array.isArray(record) && record.version === 1
          && typeof record.music === 'boolean' && typeof record.effects === 'boolean') {
          this.musicEnabled = record.music;
          this.enabled = record.effects;
        } else {
          // Only discard this game's malformed audio record, never its score.
          this._preferencesStorage.removeItem(PREFERENCES_KEY);
        }
      } catch (_) {
        this.prefStorageAvailable = false;
        this._preferencesStorage = null;
      }
    }

    _savePreferences() {
      try {
        if (!this._preferencesStorage) throw new Error('Audio preference storage unavailable');
        this._preferencesStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1,
          music: this.musicEnabled, effects: this.enabled }));
        this.prefStorageAvailable = true;
      } catch (_) { this.prefStorageAvailable = false; }
    }

    // Invoke only from Start/Resume or an audio-control user gesture. State
    // changes alone never construct or resume an AudioContext.
    unlock() {
      if (this.destroyed) return false;
      if (!this.enabled && !this.musicEnabled) return true;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      if (!this.context) {
        try {
          this.context = new Audio();
          this.musicGain = this.context.createGain();
          this.musicGain.gain.value = .09;
          this.musicGain.connect(this.context.destination);
          this.effectsGain = this.context.createGain();
          this.effectsGain.gain.value = 1;
          this.effectsGain.connect(this.context.destination);
        } catch (_) { this.context = null; return false; }
      }
      if (this.context.state === 'closed') return false;
      if (this.context.state !== 'running') {
        try {
          if (!this._resumePromise) {
            const pending = Promise.resolve(this.context.resume()).then(() => {
              if (this._resumePromise === pending) this._resumePromise = null;
              if (!this.destroyed) { this._syncMusic(); this._flushEffects(); }
            }).catch(() => {
              if (this._resumePromise === pending) this._resumePromise = null;
              this._pendingEffects = [];
            });
            this._resumePromise = pending;
          }
        } catch (_) { return false; }
      } else { this._syncMusic(); this._flushEffects(); }
      return true;
    }

    setEffects(enabled) {
      if (this.destroyed) return false;
      this.enabled = Boolean(enabled);
      // Ready-screen toggles save intent silently. Playback capabilities never
      // overwrite the visitor's choice if this browser cannot unlock audio.
      if (this.enabled && this.state === 'playing') this.unlock();
      if (!this.enabled) this._stopEffects();
      this._savePreferences();
      return this.enabled;
    }

    setMusic(enabled) {
      if (this.destroyed) return false;
      this.musicEnabled = Boolean(enabled);
      this._musicRequested = this.musicEnabled && this.state === 'playing';
      if (this.musicEnabled && this.state === 'playing') this.unlock();
      this._syncMusic();
      this._savePreferences();
      return this.musicEnabled;
    }

    toggleEffects() { return this.setEffects(!this.enabled); }
    toggleMusic() { return this.setMusic(!this.musicEnabled); }
    enable() { return this.toggleEffects(); }

    setState(state) {
      if (this.destroyed || !['ready', 'playing', 'paused', 'dying', 'over', 'exited'].includes(state)) return this.state;
      const previous = this.state;
      this.state = state;
      if (state === 'ready' || (state === 'playing' && ['ready', 'over'].includes(previous))) this._deathPlayed = false;
      this._musicRequested = state === 'playing' && this.musicEnabled;
      if (state === 'exited') this.destroy();
      else {
        this._syncMusic();
        if (state === 'paused' || state === 'ready' || (state === 'dying' && previous !== 'dying')) this._stopEffects();
      }
      return this.state;
    }

    _syncMusic() {
      if (this.destroyed || !this._musicRequested || !this.musicEnabled || this.state !== 'playing') {
        this._stopMusic();
        return;
      }
      if (!this.context || this.context.state !== 'running' || this.musicSource) return;
      this.musicBuffer ||= createMusicBuffer(this.context);
      const source = this.context.createBufferSource();
      source.buffer = this.musicBuffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = this.musicBuffer.duration;
      source.connect(this.musicGain);
      this.musicSource = source;
      this.musicPlaying = true;
      source.onended = () => {
        disconnect(source);
        if (this.musicSource === source) { this.musicSource = null; this.musicPlaying = false; }
      };
      source.start();
    }

    _stopMusic() {
      const source = this.musicSource;
      this.musicSource = null;
      this.musicPlaying = false;
      if (!source) return;
      source.onended = null;
      try { source.stop(); } catch (_) {}
      disconnect(source);
    }

    play(type) {
      if (this.destroyed || !this.enabled || !this.context || this.state === 'paused' || this.state === 'ready') return;
      if (type === 'whale-warning' && this.state !== 'playing') return;
      if (this.context.state !== 'running') {
        // Resume is gesture-initiated, but can settle after the engine's Start
        // event. Keep that effect; cancellation always clears this small queue.
        if (this.context.state === 'suspended' && this._resumePromise && (EFFECTS[type] || type === 'death')) {
          if (type !== 'death' || !this._pendingEffects.includes(type)) this._pendingEffects.push(type);
        }
        return;
      }
      if (type === 'death') {
        if (this._deathPlayed || !['dying', 'over'].includes(this.state)) return;
        this._deathPlayed = true;
        this._stopEffects();
        this._playDeath();
        return;
      }
      // Dying accepts one terminal sound, never fresh lure/damage/feeding or a
      // second legacy game-over tune after the descending death effect.
      if (this.state === 'dying' || (type === 'over' && this._deathPlayed)) return;
      for (const [hz, offset, duration] of EFFECTS[type] || []) {
        const oscillator = this.context.createOscillator(), gain = this.context.createGain();
        const at = this.context.currentTime + offset;
        oscillator.type = type === 'damage' ? 'sawtooth' : type === 'whale-warning' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(hz, at);
        if (type === 'whale-warning') oscillator.frequency.exponentialRampToValueAtTime(hz * .74, at + duration);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(type === 'whale-warning' ? (offset ? .020 : .032) : .045, at + .006);
        gain.gain.exponentialRampToValueAtTime(.001, at + duration);
        oscillator.connect(gain).connect(this.effectsGain);
        this.activeVoices.add(oscillator);
        this._voiceGains.set(oscillator, gain);
        oscillator.onended = () => this._releaseVoice(oscillator);
        oscillator.start(at);
        oscillator.stop(at + duration + .01);
      }
    }

    _flushEffects() {
      const pending = this._pendingEffects;
      this._pendingEffects = [];
      for (const type of pending) this.play(type);
    }

    _playDeath() {
      const at = this.context.currentTime;
      for (const layer of DEATH.layers) {
        const oscillator = this.context.createOscillator(), gain = this.context.createGain();
        oscillator.type = layer.type;
        oscillator.frequency.setValueAtTime(layer.start, at);
        oscillator.frequency.exponentialRampToValueAtTime(layer.end, at + DEATH.duration - .12);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(layer.gain, at + .018);
        gain.gain.exponentialRampToValueAtTime(.001, at + DEATH.duration - .08);
        gain.gain.linearRampToValueAtTime(0, at + DEATH.duration);
        oscillator.connect(gain).connect(this.effectsGain);
        this.activeVoices.add(oscillator);
        this._voiceGains.set(oscillator, gain);
        oscillator.onended = () => this._releaseVoice(oscillator);
        oscillator.start(at);
        oscillator.stop(at + DEATH.duration + .01);
      }
    }

    _releaseVoice(oscillator) {
      oscillator.onended = null;
      disconnect(oscillator);
      disconnect(this._voiceGains.get(oscillator));
      this._voiceGains.delete(oscillator);
      this.activeVoices.delete(oscillator);
    }

    _stopEffects() {
      this._pendingEffects = [];
      for (const oscillator of this.activeVoices) {
        try { oscillator.stop(); } catch (_) {}
        this._releaseVoice(oscillator);
      }
    }

    stopAll() {
      this._musicRequested = false;
      this._stopMusic();
      this._stopEffects();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.state = 'exited';
      this.stopAll();
      disconnect(this.musicGain);
      disconnect(this.effectsGain);
      this.musicGain = null;
      this.effectsGain = null;
      this.musicBuffer = null;
      if (this.context && this.context.state !== 'closed') {
        try { Promise.resolve(this.context.close()).catch(() => {}); } catch (_) {}
      }
    }
  }

  window.ArcadeAudio = ArcadeAudio;
})();
