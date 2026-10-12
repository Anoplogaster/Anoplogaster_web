(function (root) {
  'use strict';

  const WIDTH = 1200;
  const HEIGHT = 600;
  const SOURCE_WIDTH = 1536;
  const SOURCE_HEIGHT = 1024;
  const HOVER_MARGIN = 10;
  const STEP = 1 / 120;
  const MAX_DELTA = 0.25;
  const REACTION_MARGIN = 0.25;
  const MIN_APPROACH_TIME = 1.2;
  const EXIT_MARGIN = 0.12;
  const SAFE_GAP = 4; // Includes whole-body hover and integer-position rounding.
  const EPSILON = 0.000001;
  const MAX_MALES = 5;
  // Full transparent PNG dimensions preserve a 66.72px visible male body:
  // 25% of the female's 266.875px visible body axis, excluding lure height.
  const MALE_WIDTH = 71.39;
  const MALE_HEIGHT = 35.695;
  const MALE_ATTRACTION_RADIUS = 300;
  const ATTACHMENT_DURATION = 0.55;
  const DEATH_DURATION = 2.6;
  const FEEDING_DURATION = 0.48;
  const FEEDING_PHASE = FEEDING_DURATION / 5;
  const FEEDING_SEQUENCE = [0, 1, 2, 1, 0];
  const PREY_INTERVAL = 1.24;
  const PREY_VISIBLE_LIMIT = 10;
  // Weights select the next ordinary slot. A small krill cohort replaces
  // following slots; it never adds actors to the existing spawn budget.
  // Default h uses the final native artwork canvas. configurePreyArt also
  // matches the exact loaded derivative aspect after any integer-size resize.
  // Invertebrate sizes prioritize small-screen legs/antennae readability;
  // these stylized gameplay widths are not biological relative-size claims.
  const PREY_TYPES = Object.freeze({
    lanternfish: Object.freeze({ w: 72, h: 72 * 936 / 1681, sourceWidth: 1681, sourceHeight: 936, base: 10, weight: 0.24,
      behavior: 'quick-swimmer', speedMin: 145, speedMax: 180, wave: 4, vertical: 8 }),
    krill: Object.freeze({ w: 66, h: 66 * 1024 / 1536, sourceWidth: 1536, sourceHeight: 1024, base: 10, weight: 0.23,
      behavior: 'slow-cohort', speedMin: 60, speedMax: 90, wave: 3, vertical: 6 }),
    chaetognath: Object.freeze({ w: 96, h: 96 * 793 / 1983, sourceWidth: 1983, sourceHeight: 793, base: 15, weight: 0.10,
      behavior: 'short-darts', speedMin: 72, speedMax: 110, wave: 1.5, vertical: 6 }),
    amphipod: Object.freeze({ w: 66, h: 66 * 1024 / 1536, sourceWidth: 1536, sourceHeight: 1024, base: 15, weight: 0.10,
      behavior: 'erratic-swimmer', speedMin: 80, speedMax: 120, wave: 2, vertical: 12 }),
    squid: Object.freeze({ w: 100, h: 100 * 1024 / 1536, sourceWidth: 1536, sourceHeight: 1024, base: 25, weight: 0.09,
      behavior: 'intermittent-jets', speedMin: 85, speedMax: 125, wave: 1.5, vertical: 6 }),
    bristlemouth: Object.freeze({ w: 68, h: 68 * 936 / 1681, sourceWidth: 1681, sourceHeight: 936, base: 10, weight: 0.16,
      behavior: 'slow-straight', speedMin: 72, speedMax: 105, wave: 0, vertical: 0 }),
    hatchetfish: Object.freeze({ w: 70, h: 70 * 936 / 1681, sourceWidth: 1681, sourceHeight: 936, base: 20, weight: 0.08,
      behavior: 'moderate-vertical', speedMin: 100, speedMax: 134, wave: 2, vertical: 6 })
  });
  const DARTER_WINDOW = 300;
  const DARTER_LIMIT = 3;
  const DARTER_WIDTH = 90;
  const DARTER_HEIGHT = DARTER_WIDTH * 793 / 1983;
  const DARTER_SCHEDULE = Object.freeze({
    first: Object.freeze([20, 40]), subsequent: Object.freeze([60, 90]),
    window: DARTER_WINDOW, limit: DARTER_LIMIT
  });
  // Conservative cavity landmarks inspected on the approved native poses.
  // They exclude the skull, eye, esca, lower-jaw tip, fins and attached males.
  // These are arcade capture ellipses, not claims of anatomical measurements.
  const ORAL_POSES = [
    { x: 1306, y: 600, rx: 96, ry: 49 },
    { x: 1268, y: 665, rx: 100, ry: 95 },
    { x: 1244, y: 825, rx: 110, ry: 180 }
  ];
  // Alpha > 8 bounds measured with Sharp from the unchanged 1774 x 887
  // Enhanced male PNG. Bounds are pixel-cell edges, not transparent padding.
  const MALE_ANATOMY = {
    width: 1774, height: 887,
    bounds: { minX: 58, minY: 171, maxX: 1716, maxY: 724 }
  };
  const HAZARDS = {
    lancetfish: {
      w: 400, h: 400 * 724 / 2172,
      hitRx: 175, hitRy: 15.65, hitOffsetX: -6.63, hitOffsetY: 10.68,
      speedFactor: 1.45
    },
    atolla: {
      w: 130, h: 195, speedFactor: 0.65,
      // Anatomical parts in full-PNG center coordinates. The transparent box
      // and bell glow are safe; opaque bell/fringe and long tentacles hurt.
      hitParts: [
        { x: 0.76, y: -48.62, rx: 54, ry: 28 },
        { x: 0, y: -17.52, rx: 51, ry: 14 }
      ],
      tentacle: [
        { x: 8.63, y: -14.98 }, { x: 6.09, y: 1.52 },
        { x: 30.21, y: 23.11 }, { x: 43.54, y: 42.15 },
        { x: 14.36, y: 54.84 }, { x: -1.52, y: 75.16 },
        { x: 53.07, y: 92.93 }
      ],
      tentacleRadius: 3.5
    }
  };
  // These stylized arcade positions deliberately spread five males over the
  // ventral and posterior body. They are not a documented biological arrangement.
  // The approved male faces right; attached sprites retain that orientation.
  const ATTACHMENT_SLOTS = [
    { x: 590, y: 790, rotation: -0.20 }, // Beneath the pectoral fin first.
    { x: 760, y: 800, rotation: -0.55 },
    { x: 925, y: 810, rotation: -0.50 },
    { x: 1090, y: 780, rotation: 0.30 },
    { x: 640, y: 570, rotation: 0.20 }
  ];

  // Coordinates belong to the complete 1536 x 1024 PNG. The image is never
  // cropped: feeding and damage use its anatomy, rather than its padded box.
  const ANATOMY = {
    esca: { x: 1340, y: 82 },
    mouth: { x: 1306, y: 600, rx: 130, ry: 93 },
    body: { x: 985, y: 609, rx: 325, ry: 286 },
    // Union of the approved rest/opening/maximum alpha > 8 anatomy. All
    // poses retain original source registration and 280/1536 scale. Reserve
    // the entire lowered jaw at ALL times, so opening never clamps/snaps the
    // player or clips the jaw. Exclusive maxima include the last visible pixel.
    // Only the faint alpha <= 8 halo and transparent canvas are excluded.
    bounds: { minX: 33, minY: 58, maxX: 1503, maxY: 1375 }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function intersect(left, right) {
    const lo = Math.max(left[0], right[0]);
    const hi = Math.min(left[1], right[1]);
    return lo <= hi + EPSILON ? [lo, hi] : null;
  }

  function mergeIntervals(intervals) {
    const result = [];
    intervals.sort(function (a, b) { return a[0] - b[0]; });
    for (const interval of intervals) {
      const previous = result[result.length - 1];
      if (previous && interval[0] <= previous[1] + EPSILON) {
        previous[1] = Math.max(previous[1], interval[1]);
      } else {
        result.push(interval.slice());
      }
    }
    return result;
  }

  function compactEnemy(enemy) {
    if (enemy.hitParts && enemy.hitParts.length) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const part of enemy.hitParts) {
        minX = Math.min(minX, part.x - part.rx);
        maxX = Math.max(maxX, part.x + part.rx);
        minY = Math.min(minY, part.y - part.ry);
        maxY = Math.max(maxY, part.y + part.ry);
      }
      const radius = enemy.tentacleRadius || 0;
      for (const point of enemy.tentacle || []) {
        minX = Math.min(minX, point.x - radius);
        maxX = Math.max(maxX, point.x + radius);
        minY = Math.min(minY, point.y - radius);
        maxY = Math.max(maxY, point.y + radius);
      }
      // Spawn planning reserves the entire union conservatively. Real damage
      // still tests its separate anatomical parts, retaining gaps around them.
      return {
        rx: (maxX - minX) / 2, ry: (maxY - minY) / 2,
        ox: (maxX + minX) / 2, oy: (maxY + minY) / 2
      };
    }
    return {
      // Compact ellipse excludes fins, tails, and Atolla's long tentacles.
      rx: Number.isFinite(enemy.hitRx) ? enemy.hitRx : enemy.w * 0.38,
      ry: Number.isFinite(enemy.hitRy) ? enemy.hitRy : enemy.h * 0.38,
      ox: Number.isFinite(enemy.hitOffsetX) ? enemy.hitOffsetX : 0,
      oy: Number.isFinite(enemy.hitOffsetY) ? enemy.hitOffsetY : 0
    };
  }

  function ellipsesOverlap(a, b) {
    const rx = a.rx + b.rx;
    const ry = a.ry + b.ry;
    const dx = (a.x - b.x) / rx;
    const dy = (a.y - b.y) / ry;
    // Sum-of-radii ellipse is a compact, deliberately forgiving approximation
    // of two silhouettes. The spawn safety calculation is more conservative.
    return dx * dx + dy * dy <= 1;
  }

  function tentacleOverlaps(body, enemy, start, end) {
    const radius = enemy.tentacleRadius || 0;
    const rx = body.rx + radius;
    const ry = body.ry + radius;
    const startX = (enemy.x + start.x - body.x) / rx;
    const startY = (enemy.y + start.y - body.y) / ry;
    const dx = (end.x - start.x) / rx;
    const dy = (end.y - start.y) / ry;
    const lengthSquared = dx * dx + dy * dy;
    const along = lengthSquared > EPSILON
      ? clamp(-(startX * dx + startY * dy) / lengthSquared, 0, 1) : 0;
    const x = startX + dx * along;
    const y = startY + dy * along;
    return x * x + y * y <= 1;
  }

  function enemyOverlaps(body, enemy) {
    if (enemy.hitParts && enemy.hitParts.length) {
      for (const part of enemy.hitParts) {
        if (ellipsesOverlap(body, {
          x: enemy.x + part.x, y: enemy.y + part.y, rx: part.rx, ry: part.ry
        })) return true;
      }
      const tentacle = enemy.tentacle || [];
      for (let index = 1; index < tentacle.length; index += 1) {
        if (tentacleOverlaps(body, enemy, tentacle[index - 1], tentacle[index])) return true;
      }
      return false;
    }
    const hitbox = compactEnemy(enemy);
    return ellipsesOverlap(body, {
      x: enemy.x + hitbox.ox, y: enemy.y + hitbox.oy, rx: hitbox.rx, ry: hitbox.ry
    });
  }

  class ArcadeEngine {
    constructor(options) {
      options = options || {};
      this.random = typeof options.random === 'function' ? options.random : Math.random;
      // Collection must never perturb the hazard random stream. Male spawning
      // therefore uses its own injectable random source or small seeded PRNG.
      let maleSeed = Number.isFinite(options.maleSeed)
        ? options.maleSeed >>> 0 : (Date.now() ^ 0x6d2b79f5) >>> 0;
      this.maleRandom = typeof options.maleRandom === 'function' ? options.maleRandom : function () {
        maleSeed += 0x6d2b79f5;
        let value = maleSeed;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
      // The rainbow-darter illustration is now explicitly user-approved.
      // Neither rarity nor direction changes consume the prey/hazard stream.
      // An explicit false remains useful for deterministic comparison checks.
      this.darterEnabled = options.darterEnabled !== false;
      let darterSeed = Number.isFinite(options.darterSeed)
        ? options.darterSeed >>> 0 : (Date.now() ^ 0x9e3779b9) >>> 0;
      this.darterRandom = typeof options.darterRandom === 'function' ? options.darterRandom : function () {
        darterSeed += 0x6d2b79f5;
        let value = darterSeed;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
      this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : function () {};
      this._preyDimensions = {};
      for (const kind of Object.keys(PREY_TYPES)) {
        const type = PREY_TYPES[kind];
        this._preyDimensions[kind] = { w: type.w, h: type.h,
          sourceWidth: type.sourceWidth, sourceHeight: type.sourceHeight };
      }
      this._reset();
      this.state = 'ready';
    }

    _reset() {
      this.player = {
        x: 60,
        y: 206,
        speed: 285,
        width: 280,
        height: 280 * SOURCE_HEIGHT / SOURCE_WIDTH,
        invulnerable: 0
      };
      this.input = { up: false, down: false, left: false, right: false, lure: false };
      this.lure = false;
      this.prey = [];
      this.enemies = [];
      this.males = [];
      this.attachments = [];
      this.popups = [];
      this.score = 0;
      this.hearts = 3;
      this.time = 0;
      this.scroll = 0;
      this.death = null;
      this.feeding = null;
      this._preyTimer = 0.5;
      this._krillQueue = [];
      this._krillGroupId = 0;
      this._enemyTimer = 3;
      this._enemyCount = 0;
      // Encounters are uncommon: first 24–36 seconds, then every 36–52
      // seconds, about half the previous encounter frequency.
      this._maleTimer = 24 + this.maleRandom() * 12;
      this._darterSpawnTimes = [];
      // The first encounter is guaranteed while alive, independently of
      // vessels. Later due times are 60–90s apart, but the hard inclusive
      // 3/300s rolling cap can defer them until the oldest spawn expires.
      this._darterTimer = this.darterEnabled ? 20 + this.darterRandom() * 20 : Infinity;
    }

    _emit(type, detail) {
      this.onEvent(Object.assign({ type: type }, detail || {}));
    }

    pose() {
      const hover = this.reducedMotion ? 0 : Math.round(Math.sin(this.time * 2) * 1.5);
      return { x: Math.round(this.player.x), y: Math.round(this.player.y) + hover };
    }

    geometry() {
      const player = this.player;
      const pose = this.pose();
      const scale = player.width / SOURCE_WIDTH;
      const visible = this._visibleBounds(scale);
      const oral = ORAL_POSES[this.feedingPose().index];
      return {
        mouth: {
          x: pose.x + oral.x * scale,
          y: pose.y + oral.y * scale,
          rx: oral.rx * scale,
          ry: oral.ry * scale
        },
        esca: {
          x: pose.x + ANATOMY.esca.x * scale,
          y: pose.y + ANATOMY.esca.y * scale
        },
        body: {
          x: pose.x + ANATOMY.body.x * scale,
          y: pose.y + ANATOMY.body.y * scale,
          rx: ANATOMY.body.rx * scale,
          ry: ANATOMY.body.ry * scale
        },
        // Origin limits use the measured female + attached-male anatomical
        // union. The 10px vertical margin includes 2px hover clearance; the
        // empty PNG padding does not consume usable movement space.
        bounds: {
          minX: HOVER_MARGIN - visible.minX,
          maxX: WIDTH - HOVER_MARGIN - visible.maxX,
          minY: HOVER_MARGIN - visible.minY,
          maxY: HEIGHT - HOVER_MARGIN - visible.maxY
        }
      };
    }

    feedingPose() {
      const active = Boolean(this.feeding);
      const elapsed = active ? this.feeding.elapsed : 0;
      const phase = Math.min(4, Math.floor((elapsed + EPSILON) / FEEDING_PHASE));
      // Reduced motion keeps the approved resting image static; its scoring
      // clock still waits for the same oral-consumption milestone.
      const index = active && !this.reducedMotion ? FEEDING_SEQUENCE[phase] : 0;
      return {
        index: index, name: ['rest', 'opening', 'maximum'][index],
        elapsed: elapsed, duration: FEEDING_DURATION, active: active
      };
    }

    _visibleBounds(scale) {
      const result = {
        minX: ANATOMY.bounds.minX * scale,
        minY: ANATOMY.bounds.minY * scale,
        maxX: ANATOMY.bounds.maxX * scale,
        maxY: ANATOMY.bounds.maxY * scale
      };
      const maleScale = MALE_WIDTH / MALE_ANATOMY.width;
      const male = MALE_ANATOMY.bounds;
      for (const attachment of this.attachments) {
        const slot = ATTACHMENT_SLOTS[attachment.slot];
        if (!slot) continue;
        const cosine = Math.cos(slot.rotation);
        const sine = Math.sin(slot.rotation);
        for (const x of [male.minX, male.maxX]) {
          for (const y of [male.minY, male.maxY]) {
            const dx = (x - MALE_ANATOMY.width / 2) * maleScale;
            const dy = (y - MALE_ANATOMY.height / 2) * maleScale;
            const px = slot.x * scale + dx * cosine - dy * sine;
            const py = slot.y * scale + dx * sine + dy * cosine;
            result.minX = Math.min(result.minX, px);
            result.minY = Math.min(result.minY, py);
            result.maxX = Math.max(result.maxX, px);
            result.maxY = Math.max(result.maxY, py);
          }
        }
      }
      // All five approved slots currently fit inside the female's measured
      // envelope. Including them explicitly prevents future clipping without
      // adding the males' transparent image margins to the movement limits.
      return result;
    }

    get attachedMaleCount() {
      return Math.min(MAX_MALES, this.attachments.length);
    }

    get multiplier() {
      return 1 + 0.25 * this.attachedMaleCount;
    }

    attachmentSlots() {
      const pose = this.pose();
      const scale = this.player.width / SOURCE_WIDTH;
      return ATTACHMENT_SLOTS.map(function (slot) {
        return {
          x: pose.x + slot.x * scale,
          y: pose.y + slot.y * scale,
          rotation: slot.rotation
        };
      });
    }

    maleAttachmentRegion(geometry) {
      // Attachment is independent of feeding. Use the original rest-mouth
      // landmarks (including original radii), not the dynamic oral ellipse.
      const pose = this.pose();
      const scale = this.player.width / SOURCE_WIDTH;
      return {
        x: pose.x + (ANATOMY.mouth.x - ANATOMY.mouth.rx * 0.7) * scale,
        y: pose.y + (ANATOMY.mouth.y + ANATOMY.mouth.ry * 1.55) * scale,
        rx: 12,
        ry: 12
      };
    }

    difficulty() {
      // Smoothstep produces continuous, monotonic difficulty through the
      // 0/30/60/90/120-second stages and reaches its cap at 150 seconds.
      const t = clamp(this.time / 150, 0, 1);
      const progress = t * t * (3 - 2 * t);
      return {
        speed: 110 + 140 * progress,
        enemyInterval: 4.5 - 2.95 * progress,
        enemyAmplitude: 12 + 36 * progress
      };
    }

    start() {
      this._reset();
      this.state = 'playing';
      this._emit('start', { score: this.score, hearts: this.hearts });
      return this;
    }

    pause() {
      if (this.state !== 'playing') return false;
      this.setLure(false);
      this.input = { up: false, down: false, left: false, right: false, lure: false };
      this.state = 'paused';
      this._emit('pause');
      return true;
    }

    resume() {
      if (this.state !== 'paused') return false;
      this.state = 'playing';
      this._emit('resume');
      return true;
    }

    exit() {
      if (this.state === 'exited') return false;
      this.setLure(false);
      this.state = 'exited';
      this.input = { up: false, down: false, left: false, right: false, lure: false };
      this.lure = false;
      this.prey = [];
      this.enemies = [];
      this.males = [];
      this.attachments = [];
      this.popups = [];
      this.death = null;
      this.feeding = null;
      this.player.invulnerable = 0;
      this._preyTimer = Infinity;
      this._krillQueue = [];
      this._enemyTimer = Infinity;
      this._maleTimer = Infinity;
      this._darterTimer = Infinity;
      this._darterSpawnTimes = [];
      this._emit('exit', { score: this.score, time: this.time });
      return true;
    }

    setLure(enabled) {
      if (this.state === 'dying' || this.state === 'over' || this.state === 'exited') return;
      this.input.lure = Boolean(enabled);
      if (this.state !== 'playing' || this.lure === this.input.lure) return;
      this.lure = this.input.lure;
      this._emit(this.lure ? 'lureOn' : 'lureOff');
    }

    configurePreyArt(kind, naturalWidth, naturalHeight) {
      if (!Object.prototype.hasOwnProperty.call(PREY_TYPES, kind)
          || !Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight)
          || naturalWidth <= 0 || naturalHeight <= 0) return false;
      const w = PREY_TYPES[kind].w;
      const dimensions = { w: w, h: w * naturalHeight / naturalWidth,
        sourceWidth: naturalWidth, sourceHeight: naturalHeight };
      this._preyDimensions[kind] = dimensions;
      for (const prey of this.prey) {
        if (prey.kind !== kind) continue;
        prey.w = dimensions.w;
        prey.h = dimensions.h;
        const edge = Math.min(HEIGHT / 2, prey.h / 2 + 8);
        if (!prey.pending) prey.y = clamp(prey.y, edge, HEIGHT - edge);
      }
      return true;
    }

    preyDimensions(kind) {
      if (!Object.prototype.hasOwnProperty.call(this._preyDimensions, kind)) return null;
      const dimensions = this._preyDimensions[kind];
      return Object.freeze(Object.assign({}, dimensions));
    }

    ordinaryPreyCount() {
      const visited = new Set();
      let count = 0;
      for (const prey of this.prey) {
        if (prey.kind === 'darter' || prey.consumed || visited.has(prey)) continue;
        visited.add(prey);
        if (prey.x - prey.w / 2 < WIDTH && prey.x + prey.w / 2 > 0) count += 1;
      }
      return count;
    }

    _weightedPrey(sample) {
      let cumulative = 0;
      for (const kind of Object.keys(PREY_TYPES)) {
        cumulative += PREY_TYPES[kind].weight;
        if (sample < cumulative) return kind;
      }
      return 'hatchetfish';
    }

    spawnPrey(kind) {
      if (this.state === 'dying' || this.state === 'over' || this.state === 'exited') return false;
      if (kind === 'darter') return this.spawnDarter();
      // Legacy diagnostic calls still resolve to real species, never generic
      // runtime actors. Natural spawning uses only the seven weighted keys.
      if (kind === 'small') kind = 'lanternfish';
      if (kind === 'large') kind = 'squid';
      const automatic = kind === undefined;
      if (automatic) kind = this._weightedPrey(this.random());
      if (!Object.prototype.hasOwnProperty.call(PREY_TYPES, kind)) return false;
      const queued = automatic && this._krillQueue.length ? this._krillQueue.shift() : null;
      if (queued) kind = 'krill';
      const definition = PREY_TYPES[kind];
      const dimensions = this._preyDimensions[kind];
      const w = dimensions.w;
      const h = dimensions.h;
      // Every automatic slot consumes exactly five main-stream samples, just
      // like the prior prey implementation, even when a cohort fills it. No
      // behavior below draws per-frame randomness or alters hazard schedules.
      const phase = this.random() * Math.PI * 2;
      const lane = 36 + this.random() * (HEIGHT - 72);
      const speed = definition.speedMin + this.random() * (definition.speedMax - definition.speedMin);
      const drift = (this.random() - 0.5) * definition.vertical;
      const edge = Math.min(HEIGHT / 2, h / 2 + 8);
      const baseY = clamp(queued ? queued.y : lane, edge, HEIGHT - edge);
      const vx = queued ? queued.vx : -speed;
      const vy = drift;
      const prey = {
        x: WIDTH + w / 2 + 8,
        y: baseY,
        w: w,
        h: h,
        vx: vx,
        vy: vy,
        baseY: baseY,
        phase: phase,
        kind: kind,
        _cruiseVx: vx,
        _cruiseVy: vy,
        _waveAmplitude: definition.wave,
        _motionKind: kind,
        _motionElapsed: 0,
        _motionSeed: phase,
        _cycleLength: kind === 'chaetognath' ? 1.6 + phase / Math.PI * 0.9
          : kind === 'squid' ? 2.8 + phase / Math.PI * 1.1
            : kind === 'hatchetfish' ? 2 + phase / Math.PI : 0.55,
        _burstDuration: kind === 'chaetognath' ? 0.18 + phase / Math.PI * 0.05 : 0.3 + phase / Math.PI * 0.1,
        _burstSpeed: 175 + phase / (Math.PI * 2) * 15
      };
      if (queued) Object.assign(prey, queued.group);
      // Only 12% of selected krill form a cohort. Its 2–3 members occupy
      // successive normal 1.24s slots and share a slow lane/speed. This makes
      // krill slightly more common (~26% marginally) without extra density.
      if (automatic && !queued && kind === 'krill' && phase / (Math.PI * 2) < 0.12) {
        const size = phase / (Math.PI * 2) < 0.06 ? 3 : 2;
        const groupId = ++this._krillGroupId;
        Object.assign(prey, { groupId: groupId, groupSize: size, groupIndex: 0 });
        for (let index = 1; index < size; index += 1) {
          this._krillQueue.push({ y: baseY + (index % 2 ? 8 : -8), vx: vx,
            group: { groupId: groupId, groupSize: size, groupIndex: index } });
        }
      }
      // Slow species retain their character without building a denser field
      // than the previous observed ten-prey maximum. Perform the complete
      // selection, five draws and cohort bookkeeping BEFORE skipping an
      // insertion: occupancy must never perturb the seeded hazard stream.
      // New actors enter from the right before the next 1.24s slot, so this
      // visible cap cannot accumulate an off-screen queue of pending entries.
      if (this.ordinaryPreyCount() >= PREY_VISIBLE_LIMIT) return false;
      this.prey.push(prey);
      return prey;
    }

    _ordinaryPreyMotion(prey, dt) {
      if (!prey._motionKind) return false;
      prey._motionElapsed += dt;
      const elapsed = prey._motionElapsed;
      const seed = prey._motionSeed;
      const cycle = prey._cycleLength;
      let burst = false;
      if (prey._motionKind === 'chaetognath' || prey._motionKind === 'squid') {
        burst = elapsed % cycle < prey._burstDuration;
      } else if (prey._motionKind === 'amphipod') {
        const segment = Math.floor(elapsed / cycle);
        const turn = Math.sin(seed + segment * 2.399963);
        prey._cruiseVx = -(80 + Math.abs(turn) * 40);
        prey._cruiseVy = turn * 40;
      } else if (prey._motionKind === 'hatchetfish') {
        const segment = Math.floor(elapsed / cycle);
        prey._cruiseVy = Math.sin(seed + segment * 2.399963) * 24;
      }
      // Ordinary burst targets stay below the rare darter's 195px/s minimum.
      prey._bursting = burst;
      return burst;
    }

    spawnDarter() {
      if (!this.darterEnabled || this.state === 'dying' || this.state === 'over'
          || this.state === 'exited') return false;
      this._darterSpawnTimes = this._darterSpawnTimes.filter(time => this.time - time <= DARTER_WINDOW + EPSILON);
      if (this._darterSpawnTimes.length >= DARTER_LIMIT) return false;
      const w = DARTER_WIDTH;
      const h = DARTER_HEIGHT;
      const vx = -(195 + this.darterRandom() * 55);
      const vy = (this.darterRandom() - 0.5) * 55;
      const baseY = 70 + this.darterRandom() * (HEIGHT - 140);
      const prey = {
        x: WIDTH + w / 2 + 8, y: baseY, w: w, h: h,
        vx: vx, vy: vy, baseY: baseY,
        phase: this.darterRandom() * Math.PI * 2,
        kind: 'darter', _cruiseVx: vx, _cruiseVy: vy,
        _waveAmplitude: 3.5, _directionTimer: 1.8 + this.darterRandom() * 2.4
      };
      this._darterSpawnTimes.push(this.time);
      this.prey.push(prey);
      return prey;
    }

    _capturePrey(prey, geometry) {
      if (prey.pending || prey.consumed) return;
      if (!this.feeding) this.feeding = { elapsed: 0, duration: FEEDING_DURATION, pending: [] };
      prey.pending = true;
      // Normalize a small oral-relative offset, so captured actors follow
      // movement and changing cavity landmarks rather than frozen world XY.
      prey._oralOffsetX = clamp((prey.x - geometry.mouth.x) / geometry.mouth.rx, -0.7, 0.7);
      prey._oralOffsetY = clamp((prey.y - geometry.mouth.y) / geometry.mouth.ry, -0.7, 0.7);
      this.feeding.pending.push(prey);
      this._positionPendingPrey(geometry);
    }

    _positionPendingPrey(geometry) {
      if (!this.feeding) return;
      for (const prey of this.feeding.pending) {
        prey.x = geometry.mouth.x + prey._oralOffsetX * geometry.mouth.rx * 0.75;
        prey.y = geometry.mouth.y + prey._oralOffsetY * geometry.mouth.ry * 0.75;
      }
    }

    _consumePending(geometry) {
      if (!this.feeding || !this.feeding.pending.length) return;
      const pending = this.feeding.pending;
      this.feeding.pending = [];
      for (const prey of pending) {
        if (prey.consumed) continue;
        prey.pending = false;
        prey.consumed = true;
        const base = prey.kind === 'darter' ? 100
          : PREY_TYPES[prey.kind] ? PREY_TYPES[prey.kind].base : prey.kind === 'large' ? 25 : 10;
        const multiplier = this.multiplier;
        const value = Math.round(base * multiplier);
        const label = prey.kind === 'darter' ? 'FARTER' : undefined;
        this.score += value;
        const nearby = this.popups.filter(popup => popup.age < 0.55
          && Math.abs(popup.x - geometry.mouth.x) < 96
          && Math.abs(popup.y - geometry.mouth.y) < 240).length;
        const popup = { x: geometry.mouth.x, y: geometry.mouth.y - nearby * 24, value: value, age: 0 };
        const event = { base: base, value: value, multiplier: multiplier,
          kind: prey.kind, x: prey.x, y: prey.y, score: this.score };
        if (label) { popup.label = label; event.label = label; }
        this.popups.push(popup);
        this._emit('eat', event);
      }
      this.prey = this.prey.filter(prey => !prey.consumed);
    }

    _advanceFeeding(dt) {
      if (!this.feeding) return;
      const previousElapsed = this.feeding.elapsed;
      this.feeding.elapsed = Math.min(FEEDING_DURATION, previousElapsed + dt);
      const geometry = this.geometry();
      this._positionPendingPrey(geometry);
      if (this.feeding.elapsed >= FEEDING_PHASE * 2 - EPSILON
          && previousElapsed < FEEDING_PHASE * 3 - EPSILON) this._consumePending(geometry);
      if (this.feeding.elapsed >= FEEDING_DURATION - EPSILON) {
        // Meals arriving during closing wait visibly for the next opening;
        // they never restart or compete with the current animation state.
        this.feeding = this.feeding.pending.length
          ? { elapsed: 0, duration: FEEDING_DURATION, pending: this.feeding.pending } : null;
      }
    }

    spawnMale() {
      if (this.attachedMaleCount >= MAX_MALES || this.state === 'dying'
          || this.state === 'over' || this.state === 'exited') return false;
      const phase = this.maleRandom() * Math.PI * 2;
      // Every cruising lane is reachable by vertical swimming before the male
      // crosses the head. Full sprites retain clearance from the field edges.
      const baseY = 100 + this.maleRandom() * (HEIGHT - 200);
      const vx = -(100 + this.maleRandom() * 25);
      const vy = (this.maleRandom() - 0.5) * 6;
      const male = {
        x: WIDTH + MALE_WIDTH / 2 + 8,
        y: baseY,
        w: MALE_WIDTH,
        h: MALE_HEIGHT,
        vx: vx,
        vy: vy,
        baseY: baseY,
        phase: phase,
        attracted: false,
        _cruiseVx: vx,
        _cruiseVy: vy
      };
      this.males.push(male);
      return male;
    }

    _encounterWindow(enemy, geometry) {
      const speed = -enemy.vx;
      if (!Number.isFinite(speed) || speed <= 0 || !Number.isFinite(enemy.x)) return null;
      const hitbox = compactEnemy(enemy);
      const horizontalRadius = geometry.body.rx + hitbox.rx + SAFE_GAP;
      // Project against the CURRENT horizontal pose. Holding x and swimming
      // vertically at 285px/s remains a valid escape route, including at the
      // real right edge; retreat adds options. Charging into a hazard is optional.
      const entry = (enemy.x + hitbox.ox - geometry.body.x - horizontalRadius) / speed;
      const exit = (enemy.x + hitbox.ox - geometry.body.x + horizontalRadius) / speed;
      if (exit + EXIT_MARGIN < 0) return null;
      const scale = this.player.width / SOURCE_WIDTH;
      const playerBodyOffset = ANATOMY.body.y * scale;
      const baseY = (Number.isFinite(enemy.baseY) ? enemy.baseY : enemy.y) + hitbox.oy;
      const amplitude = Number.isFinite(enemy.amplitude)
        ? Math.abs(enemy.amplitude)
        : this.difficulty().enemyAmplitude;
      const verticalRadius = geometry.body.ry + hitbox.ry + amplitude + SAFE_GAP;
      return {
        // Expanding the complete horizontal crossing in time reserves reaction
        // time and avoids treating an enemy as a momentary vertical obstacle.
        entry: Math.max(0, entry - REACTION_MARGIN),
        exit: Math.max(0, exit + EXIT_MARGIN),
        blocked: [
          baseY - playerBodyOffset - verticalRadius,
          baseY - playerBodyOffset + verticalRadius
        ]
      };
    }

    _safeIntervals(active, bounds) {
      const blocked = [];
      for (const window of active) {
        const clipped = intersect(window.blocked, [bounds.minY, bounds.maxY]);
        if (clipped) blocked.push(clipped);
      }
      const merged = mergeIntervals(blocked);
      const safe = [];
      let cursor = bounds.minY;
      for (const interval of merged) {
        if (cursor < interval[0] - EPSILON) safe.push([cursor, interval[0] - EPSILON]);
        cursor = Math.max(cursor, interval[1] + EPSILON);
      }
      if (cursor <= bounds.maxY) safe.push([cursor, bounds.maxY]);
      return safe;
    }

    canSpawnEnemy(candidate) {
      if (!candidate || !Number.isFinite(candidate.y) || !Number.isFinite(candidate.x)
          || !Number.isFinite(candidate.vx) || candidate.vx >= 0 || !Number.isFinite(candidate.w)
          || !Number.isFinite(candidate.h) || candidate.w <= 0 || candidate.h <= 0) return false;
      const geometry = this.geometry();
      const windows = [];
      for (const enemy of this.enemies.concat([candidate])) {
        const window = this._encounterWindow(enemy, geometry);
        if (window) windows.push(window);
      }
      if (!windows.length) return false;

      // Sweep both ENTRY and EXIT boundaries. During each interval, reachable
      // positions expand only within a connected safe lane. Expanding first
      // and then subtracting blockers would incorrectly let the player pass
      // straight through an enemy's vertical band.
      const events = [];
      for (const window of windows) {
        events.push({ time: window.entry, entering: true, window: window });
        events.push({ time: window.exit, entering: false, window: window });
      }
      events.sort(function (a, b) { return a.time - b.time; });
      const active = new Set();
      let reachable = [[clamp(this.player.y, geometry.bounds.minY, geometry.bounds.maxY),
        clamp(this.player.y, geometry.bounds.minY, geometry.bounds.maxY)]];
      let previousTime = 0;
      let index = 0;

      while (index < events.length) {
        const time = events[index].time;
        const travel = this.player.speed * Math.max(0, time - previousTime);
        const lanes = this._safeIntervals(active, geometry.bounds);
        const advanced = [];
        for (const lane of lanes) {
          for (const position of reachable) {
            const overlap = intersect(position, lane);
            if (overlap) advanced.push([
              Math.max(lane[0], overlap[0] - travel),
              Math.min(lane[1], overlap[1] + travel)
            ]);
          }
        }
        reachable = mergeIntervals(advanced);
        if (!reachable.length) return false;

        // Simultaneous exits and entries apply together before the next span.
        const group = [];
        while (index < events.length && Math.abs(events[index].time - time) <= EPSILON) {
          group.push(events[index++]);
        }
        for (const event of group) if (!event.entering) active.delete(event.window);
        for (const event of group) if (event.entering) active.add(event.window);
        const nextLanes = this._safeIntervals(active, geometry.bounds);
        const clipped = [];
        for (const lane of nextLanes) {
          for (const position of reachable) {
            const overlap = intersect(position, lane);
            if (overlap) clipped.push(overlap);
          }
        }
        reachable = mergeIntervals(clipped);
        if (!reachable.length) return false;
        previousTime = time;
      }
      return true;
    }

    spawnEnemy() {
      if (this.state === 'dying' || this.state === 'over' || this.state === 'exited') return false;
      const difficulty = this.difficulty();
      const phase = this.random() * Math.PI * 2;
      const variant = this.random();
      const kind = variant < 0.42 ? 'atolla' : 'lancetfish';
      const dimensions = HAZARDS[kind];
      const w = dimensions.w;
      const h = dimensions.h;
      const isAtolla = kind === 'atolla';
      const amplitude = difficulty.enemyAmplitude * (isAtolla ? 0.86 : 1);
      const edge = h / 2 + amplitude + 12;
      const geometry = this.geometry();
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const baseY = edge + this.random() * (HEIGHT - edge * 2);
        const candidate = {
          x: WIDTH + w / 2 + 12,
          y: baseY + Math.sin(phase) * amplitude,
          w: w,
          h: h,
          vx: -Math.min(350, difficulty.speed * dimensions.speedFactor),
          vy: 0,
          baseY: baseY,
          phase: phase,
          kind: kind,
          hitRx: dimensions.hitRx,
          hitRy: dimensions.hitRy,
          hitOffsetX: dimensions.hitOffsetX,
          hitOffsetY: dimensions.hitOffsetY,
          hitParts: dimensions.hitParts,
          tentacle: dimensions.tentacle,
          tentacleRadius: dimensions.tentacleRadius,
          amplitude: amplitude,
          frequency: isAtolla ? 1.08 : 0.86,
          id: this._enemyCount + 1
        };
        // Full horizontal freedom exposes a short reaction interval at the
        // real right edge. Extend ONLY the off-screen approach as necessary;
        // do not speed up hazards, increase their schedule, or invent a wall.
        // game.js shows an incoming-lane cue during this approach. The normal
        // left/middle spawn position is retained when it already affords time.
        const hitbox = compactEnemy(candidate);
        const frontClearance = geometry.body.rx + hitbox.rx + SAFE_GAP;
        candidate.x = Math.max(candidate.x,
          geometry.body.x + frontClearance - hitbox.ox - candidate.vx * MIN_APPROACH_TIME);
        if (this.canSpawnEnemy(candidate)) {
          this._enemyCount += 1;
          this.enemies.push(candidate);
          return candidate;
        }
      }
      // A failed placement is retried shortly by the caller. It never forces
      // an unsafe spawn merely to keep the difficulty schedule on time.
      return false;
    }

    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      if (this.state === 'dying') {
        // Visibility suspension is owned by the caller: do not call update
        // while hidden, and reset its frame timestamp when returning.
        this.death.elapsed = this.reducedMotion ? this.death.duration
          : Math.min(this.death.duration, this.death.elapsed + dt);
        if (this.death.elapsed >= this.death.duration - EPSILON) this._completeDeath();
        return;
      }
      if (this.state !== 'playing') return;
      // A suspended tab cannot teleport actors across the fish. Normal fixed
      // 1/120 updates retain all their time; long frames discard excess time.
      let remaining = Math.min(dt, MAX_DELTA);
      while (remaining > EPSILON && this.state === 'playing') {
        const step = Math.min(remaining, STEP);
        this._step(step);
        remaining -= step;
      }
    }

    _beginDeath(geometry) {
      if (this.state !== 'playing') return;
      const feedingPose = this.feedingPose();
      // Pending meals cannot score during the death float. Retain the chosen
      // artwork pose separately so the renderer need not snap the jaw closed.
      this.prey = this.prey.filter(prey => !prey.pending);
      this.feeding = null;
      this.setLure(false);
      this.state = 'dying';
      this.input = { up: false, down: false, left: false, right: false, lure: false };
      this.lure = false;
      this._preyTimer = Infinity;
      this._krillQueue = [];
      this._enemyTimer = Infinity;
      this._maleTimer = Infinity;
      this._darterTimer = Infinity;
      this.death = {
        elapsed: 0,
        duration: DEATH_DURATION,
        originPose: this.pose(),
        pivot: { x: geometry.body.x, y: geometry.body.y },
        score: this.score,
        time: this.time
      };
      this.death.feedingPose = feedingPose;
      this._emit('death', { score: this.death.score, time: this.death.time });
      if (this.reducedMotion) this._completeDeath();
    }

    _completeDeath() {
      if (this.state !== 'dying' || !this.death) return;
      this.death.elapsed = this.death.duration;
      this.state = 'over';
      this._emit('over', { score: this.death.score, time: this.death.time });
    }

    _step(dt) {
      this.setLure(this.input.lure);
      this.time += dt;
      const difficulty = this.difficulty();
      this.scroll += difficulty.speed * dt;
      const bounds = this.geometry().bounds;
      const directionX = Number(Boolean(this.input.right)) - Number(Boolean(this.input.left));
      const directionY = Number(Boolean(this.input.down)) - Number(Boolean(this.input.up));
      // Opposing directions cancel. Normalizing the instantaneous input vector
      // gives the same speed on diagonals, and releasing it produces no drift.
      const length = Math.hypot(directionX, directionY) || 1;
      const travel = this.player.speed * dt / length;
      this.player.x = clamp(this.player.x + directionX * travel, bounds.minX, bounds.maxX);
      this.player.y = clamp(this.player.y + directionY * travel,
        bounds.minY, bounds.maxY);
      this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);

      this._preyTimer -= dt;
      if (this._preyTimer <= 0) {
        this.spawnPrey();
        this._preyTimer += PREY_INTERVAL;
      }
      this._enemyTimer -= dt;
      if (this._enemyTimer <= 0) {
        const spawned = this.spawnEnemy();
        this._enemyTimer += spawned ? difficulty.enemyInterval : 0.45;
      }
      if (this.attachedMaleCount < MAX_MALES) {
        this._maleTimer -= dt;
        if (this._maleTimer <= 0) {
          this.spawnMale();
          this._maleTimer += 36 + this.maleRandom() * 16;
        }
      } else {
        this._maleTimer = Infinity;
      }

      if (this.darterEnabled) {
        this._darterTimer -= dt;
        if (this._darterTimer <= 0) {
          if (this.spawnDarter()) {
            this._darterTimer += 60 + this.darterRandom() * 30;
          } else {
            // Hard rolling cap also covers manual review spawns. Wait beyond
            // the oldest timestamp rather than repeatedly trying every frame.
            this._darterTimer = this._darterSpawnTimes.length
              ? Math.max(1, this._darterSpawnTimes[0] + DARTER_WINDOW + 1 - this.time) : 1;
          }
        }
      }

      const geometry = this.geometry();
      const survivors = [];
      const visitedPrey = new Set();
      for (const prey of this.prey) {
        // A duplicated reference must never create a duplicated meal or draw.
        if (prey.consumed || visitedPrey.has(prey)) continue;
        visitedPrey.add(prey);
        if (prey.pending) { survivors.push(prey); continue; }
        const burst = this._ordinaryPreyMotion(prey, dt);
        if (prey.kind === 'darter') {
          prey._directionTimer -= dt;
          if (prey._directionTimer <= 0) {
            prey._cruiseVy = (this.darterRandom() - 0.5) * 90;
            prey._directionTimer += 1.8 + this.darterRandom() * 2.4;
          }
          const edge = prey.h / 2 + 8;
          if (prey.y <= edge && prey._cruiseVy < 0) prey._cruiseVy = Math.abs(prey._cruiseVy);
          if (prey.y >= HEIGHT - edge && prey._cruiseVy > 0) prey._cruiseVy = -Math.abs(prey._cruiseVy);
        }
        prey.phase += dt * 1.8;
        const cruiseVx = burst ? -prey._burstSpeed
          : Number.isFinite(prey._cruiseVx) ? prey._cruiseVx : prey.vx;
        const cruiseVy = Number.isFinite(prey._cruiseVy) ? prey._cruiseVy : 0;
        const wave = Math.cos(prey.phase) * (Number.isFinite(prey._waveAmplitude) ? prey._waveAmplitude : 5);
        let targetVx = cruiseVx;
        let targetVy = cruiseVy + wave;
        const dx = geometry.mouth.x - prey.x;
        const dy = geometry.mouth.y - prey.y;
        const distance = Math.hypot(dx, dy);
        const lightDistance = Math.hypot(geometry.esca.x - prey.x, geometry.esca.y - prey.y);
        const attracted = this.lure && lightDistance < 260;
        if (attracted) {
          // Attraction turns swimming gradually. It targets the actual mouth
          // and becomes strong near it, retaining a small natural wave.
          const influence = (0.32 + 0.68 * (1 - lightDistance / 260))
            * (prey.kind === 'darter' ? 0.3 : 1);
          const swimSpeed = prey.kind === 'darter' ? 225 : 145 + 35 * influence;
          const divisor = Math.max(distance, 1);
          targetVx = cruiseVx * (1 - influence) + dx / divisor * swimSpeed * influence;
          targetVy = dy / divisor * swimSpeed * influence + wave * (1 - influence * 0.88);
        }
        const steering = 1 - Math.exp(-dt * (attracted ? 4.2 : burst ? 12 : 2.4));
        prey.vx += (targetVx - prey.vx) * steering;
        prey.vy += (targetVy - prey.vy) * steering;
        prey.x += prey.vx * dt;
        const edge = Math.min(HEIGHT / 2, prey.h / 2 + 8);
        prey.y = clamp(prey.y + prey.vy * dt, edge, HEIGHT - edge);
        // Capture requires the actor center INSIDE the conservative oral
        // cavity. A sprite's fins/tail merely touching a fish/body/lure/male
        // cannot expand the mouth collider or produce points.
        const oralX = (prey.x - geometry.mouth.x) / geometry.mouth.rx;
        const oralY = (prey.y - geometry.mouth.y) / geometry.mouth.ry;
        if (oralX * oralX + oralY * oralY <= 1) this._capturePrey(prey, geometry);
        if (prey.pending || prey.x + prey.w / 2 >= -40) survivors.push(prey);
      }
      this.prey = survivors;

      const attachmentRegion = this.maleAttachmentRegion(geometry);
      const remainingMales = [];
      for (const male of this.males) {
        male.phase += dt * 1.5;
        const cruiseVx = Number.isFinite(male._cruiseVx) ? male._cruiseVx : male.vx;
        const cruiseVy = Number.isFinite(male._cruiseVy) ? male._cruiseVy : 0;
        const wave = Math.cos(male.phase) * 5;
        let targetVx = cruiseVx;
        let targetVy = cruiseVy + wave;
        const lightDistance = Math.hypot(geometry.esca.x - male.x, geometry.esca.y - male.y);
        const attracted = this.lure && lightDistance < MALE_ATTRACTION_RADIUS
          && this.attachedMaleCount < MAX_MALES;
        male.attracted = attracted;
        if (attracted) {
          const dx = attachmentRegion.x - male.x;
          const dy = attachmentRegion.y - male.y;
          const distance = Math.max(Math.hypot(dx, dy), 1);
          const influence = 0.5 + 0.5 * (1 - lightDistance / MALE_ATTRACTION_RADIUS);
          const swimSpeed = 120 + 32 * influence;
          targetVx = cruiseVx * (1 - influence) + dx / distance * swimSpeed * influence;
          targetVy = dy / distance * swimSpeed * influence + wave * (1 - influence * 0.9);
        }
        const steering = 1 - Math.exp(-dt * (attracted ? 3.7 : 2.4));
        male.vx += (targetVx - male.vx) * steering;
        male.vy += (targetVy - male.vy) * steering;
        male.x += male.vx * dt;
        male.y = clamp(male.y + male.vy * dt, male.h / 2 + 8, HEIGHT - male.h / 2 - 8);
        if (attracted && ellipsesOverlap(attachmentRegion, {
          x: male.x, y: male.y, rx: male.w * 0.12, ry: male.h * 0.25
        })) {
          const slot = this.attachedMaleCount;
          this.attachments.push({ slot: slot, age: 0, fromX: male.x, fromY: male.y });
          if (this.attachedMaleCount === MAX_MALES) this._maleTimer = Infinity;
          this._emit('attach', {
            count: this.attachedMaleCount, multiplier: this.multiplier,
            slot: slot, x: male.x, y: male.y
          });
        } else if (male.x + male.w / 2 >= -40) {
          remainingMales.push(male);
        }
      }
      this.males = remainingMales;
      for (const attachment of this.attachments) {
        attachment.age = Math.min(ATTACHMENT_DURATION, attachment.age + dt);
      }

      const remainingEnemies = [];
      for (const enemy of this.enemies) {
        // Enemy motion contains no lure branch and consumes no random values.
        enemy.x += enemy.vx * dt;
        enemy.phase += dt * enemy.frequency;
        const previousY = enemy.y;
        enemy.y = enemy.baseY + Math.sin(enemy.phase) * enemy.amplitude;
        enemy.vy = (enemy.y - previousY) / dt;
        const collides = enemyOverlaps(geometry.body, enemy);
        if (collides && this.player.invulnerable <= 0) {
          this.hearts = Math.max(0, this.hearts - 1);
          this.player.invulnerable = 1.5;
          this._emit('damage', { hearts: this.hearts, x: geometry.body.x, y: geometry.body.y });
          // Remove the enemy that did damage, preventing a lingering second
          // hit when the invulnerability period ends.
          if (this.hearts === 0) {
            this._beginDeath(geometry);
            // Freeze every actor and attachment immediately. Further enemies
            // in this frame cannot collide, score, or advance the death clock.
            return;
          }
        } else if (enemy.x + enemy.w / 2 >= -40) {
          remainingEnemies.push(enemy);
        }
      }
      this.enemies = remainingEnemies;
      // Damage resolves first: a final-heart collision cancels pending meals
      // rather than awarding a last meal after the frozen death snapshot.
      this._advanceFeeding(dt);
      for (const popup of this.popups) popup.age += dt;
      this.popups = this.popups.filter(function (popup) { return popup.age < 1.1; });
    }
  }

  ArcadeEngine.WIDTH = WIDTH;
  ArcadeEngine.HEIGHT = HEIGHT;
  ArcadeEngine.ANATOMY = ANATOMY;
  ArcadeEngine.MAX_MALES = MAX_MALES;
  ArcadeEngine.MALE_WIDTH = MALE_WIDTH;
  ArcadeEngine.MALE_HEIGHT = MALE_HEIGHT;
  ArcadeEngine.MALE_ANATOMY = MALE_ANATOMY;
  ArcadeEngine.ATTACHMENT_DURATION = ATTACHMENT_DURATION;
  ArcadeEngine.DEATH_DURATION = DEATH_DURATION;
  ArcadeEngine.FEEDING_DURATION = FEEDING_DURATION;
  ArcadeEngine.FEEDING_SEQUENCE = FEEDING_SEQUENCE;
  Object.defineProperty(ArcadeEngine, 'PREY_TYPES', { value: PREY_TYPES, enumerable: true });
  ArcadeEngine.PREY_INTERVAL = PREY_INTERVAL;
  ArcadeEngine.PREY_VISIBLE_LIMIT = PREY_VISIBLE_LIMIT;
  ArcadeEngine.ORAL_POSES = ORAL_POSES;
  ArcadeEngine.DARTER_WINDOW = DARTER_WINDOW;
  ArcadeEngine.DARTER_LIMIT = DARTER_LIMIT;
  ArcadeEngine.DARTER_WIDTH = DARTER_WIDTH;
  ArcadeEngine.DARTER_HEIGHT = DARTER_HEIGHT;
  ArcadeEngine.DARTER_SCHEDULE = DARTER_SCHEDULE;
  ArcadeEngine.MIN_APPROACH_TIME = MIN_APPROACH_TIME;
  ArcadeEngine.HAZARDS = HAZARDS;
  root.ArcadeEngine = ArcadeEngine;
})(typeof window !== 'undefined' ? window : globalThis);
