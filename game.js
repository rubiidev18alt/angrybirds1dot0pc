/*
 * Slingstone - original physics puzzle game.
 * Copyright (c) 2026 rubiidev18alt
 * Licensed under the MIT License. See LICENSE.
 *
 * Physics: Matter.js 0.20.0 (MIT) - see vendor/MATTER_LICENSE.txt.
 * All graphics are drawn procedurally with Canvas 2D.
 * All sounds are synthesized with the Web Audio API.
 *
 * No Angry Birds (or other third-party) artwork, audio, characters, level
 * data, binaries, or trademarks are used. Genre mechanics (a slingshot,
 * breakable structures, tappable shot abilities, star ratings) are implemented
 * here in original code with original art.
 */

(() => {
  "use strict";

  const { Engine, Bodies, Body, Composite, Events, Query, Sleeping } = Matter;

  // ---------------------------------------------------------------------------
  // Constants and tuning
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = 520;
  const WORLD_W = 1520;
  const ANCHOR = { x: 190, y: 396 };
  const FORK = { left: ANCHOR.x - 26, right: ANCHOR.x + 26, y: ANCHOR.y - 34 };
  const MAX_DRAG = 125;
  const LAUNCH_SPEED = 18.5;        // px per 60 Hz step at a full pull (~1110 px/s)
  const GRAB_RADIUS = 118;
  const STEP_MS = 1000 / 60;
  const GRAVITY_SCALE = 0.0009;
  const STEP_ACCEL = GRAVITY_SCALE * STEP_MS * STEP_MS; // px per step^2
  const RELOAD_DELAY = 0.35;
  const STONE_MAX_AGE = 4.5;
  const CAM_MAX = WORLD_W - W;

  const MATERIALS = {
    wood:  { density: 0.0014, hp: 105, restitution: 0.06, friction: 0.68, score: 60 },
    glass: { density: 0.0009, hp: 42,  restitution: 0.02, friction: 0.35, score: 60 },
    stone: { density: 0.0035, hp: 270, restitution: 0.03, friction: 0.85, score: 90 },
  };

  const STONE_TYPES = {
    pebble:   { r: 15, density: 0.006,  glyph: "●", name: "Pebble",   color: "#9aa8bd", ability: null },
    bolt:     { r: 14, density: 0.0052, glyph: "⚡", name: "Bolt",     color: "#5eead4", ability: "surge" },
    bomber:   { r: 17, density: 0.0072, glyph: "✸", name: "Bomber",   color: "#ef4444", ability: "blast" },
    splitter: { r: 15, density: 0.0055, glyph: "✦", name: "Splitter", color: "#c4b5fd", ability: "scatter" },
    bubble:   { r: 16, density: 0.0045, glyph: "◎", name: "Bubble",   color: "#ec4899", ability: "uplift" },
    inflator: { r: 15, density: 0.006,  glyph: "◉", name: "Inflator", color: "#fb923c", ability: "inflate" },
    boulder:  { r: 26, density: 0.02,   glyph: "◆", name: "Boulder",  color: "#64748b", ability: null, heavy: true },
  };

  const ABILITY_TEXT = {
    pebble: "No special ability — a solid, reliable stone.",
    bolt: "<strong>Bolt:</strong> click, tap, or press Space mid-flight for a burst of speed.",
    bomber: "<strong>Bomber:</strong> click, tap, or press Space mid-flight to detonate.",
    splitter: "<strong>Splitter:</strong> click, tap, or press Space mid-flight to split into three.",
    bubble: "<strong>Bubble (pink):</strong> tap mid-flight to release a rising lift that floats blocks and wisps upward.",
    inflator: "<strong>Inflator (orange):</strong> tap mid-flight to swell into a giant crushing boulder.",
    boulder: "<strong>Boulder:</strong> no ability — but enormous weight and huge impact damage.",
  };

  // Block definitions use top-left x/y for easy level authoring.
  const b = (type, x, y, w, h) => ({ type, x, y, w, h });
  // Wisps normally pop in one hit. A boss wisp has hp > 1 and an armored look.
  const wisp = (x, y, r = 16, opts = {}) => ({ x, y, r, hp: opts.hp ?? 1, boss: !!opts.boss, hue: opts.hue });

  const LEVELS = [
    {
      name: "First Flight",
      ammo: ["pebble", "pebble", "bolt", "bomber"],
      blocks: [
        b("wood", 686, 416, 24, 104),
        b("wood", 830, 416, 24, 104),
        b("wood", 666, 396, 208, 20),
        b("glass", 750, 356, 40, 40),
        b("wood", 906, 476, 52, 44),
      ],
      wisps: [wisp(770, 339), wisp(770, 504), wisp(990, 504)],
    },
    {
      name: "Timber Yard",
      ammo: ["pebble", "bolt", "bomber", "splitter", "pebble"],
      blocks: [
        b("stone", 806, 472, 170, 48),
        b("wood", 816, 400, 22, 72),
        b("wood", 944, 400, 22, 72),
        b("wood", 806, 380, 160, 20),
        b("glass", 864, 340, 40, 40),
        b("glass", 920, 340, 40, 40),
        b("wood", 1110, 440, 22, 80),
        b("wood", 1240, 440, 22, 80),
        b("wood", 1096, 420, 180, 20),
        b("stone", 1160, 396, 52, 24),
      ],
      wisps: [wisp(884, 323), wisp(1000, 504), wisp(1186, 504), wisp(1330, 504)],
    },
    {
      name: "Sky Keep",
      ammo: ["bolt", "bomber", "splitter", "pebble", "pebble", "bomber"],
      blocks: [
        b("stone", 782, 480, 320, 40),
        b("stone", 782, 376, 28, 104),
        b("stone", 1074, 376, 28, 104),
        b("stone", 782, 356, 320, 20),
        b("glass", 880, 436, 40, 40),
        b("glass", 964, 436, 40, 40),
        b("wood", 1210, 424, 22, 96),
        b("wood", 1332, 424, 22, 96),
        b("wood", 1196, 404, 172, 20),
        b("glass", 1262, 364, 40, 40),
      ],
      wisps: [wisp(860, 463), wisp(1020, 463), wisp(1130, 504), wisp(1282, 346), wisp(1410, 504)],
    },
    {
      name: "Bubble Bath",
      ammo: ["pebble", "bubble", "bubble", "bolt", "bomber"],
      blocks: [
        b("wood", 700, 452, 22, 68),
        b("wood", 860, 452, 22, 68),
        b("wood", 700, 436, 182, 18),
        b("glass", 752, 400, 40, 36),
        b("glass", 800, 400, 40, 36),
        b("stone", 980, 476, 120, 44),
      ],
      wisps: [wisp(772, 380), wisp(820, 380), wisp(1040, 458), wisp(1180, 504), wisp(660, 504)],
    },
    {
      name: "Heavy Metal",
      ammo: ["boulder", "pebble", "bolt", "bomber", "boulder"],
      blocks: [
        b("stone", 720, 468, 40, 52),
        b("stone", 940, 468, 40, 52),
        b("stone", 720, 436, 260, 32),
        b("stone", 830, 356, 40, 80),
        b("glass", 1010, 476, 40, 44),
        b("glass", 1058, 476, 40, 44),
        b("wood", 1010, 440, 88, 18),
      ],
      wisps: [wisp(850, 336), wisp(1054, 420), wisp(1180, 504), wisp(660, 504)],
    },
    {
      name: "Split Decision",
      ammo: ["splitter", "splitter", "pebble", "bomber", "bolt", "bubble"],
      blocks: [
        b("wood", 690, 440, 20, 80),
        b("wood", 790, 440, 20, 80),
        b("wood", 690, 424, 120, 16),
        b("glass", 900, 476, 40, 44),
        b("glass", 900, 432, 40, 44),
        b("wood", 1040, 456, 20, 64),
        b("wood", 1150, 456, 20, 64),
        b("wood", 1040, 440, 130, 16),
        b("stone", 1080, 404, 50, 36),
      ],
      wisps: [wisp(750, 404), wisp(920, 412), wisp(1105, 384), wisp(1240, 504), wisp(640, 504)],
    },
    {
      name: "Up, Up & Away",
      ammo: ["bubble", "bubble", "bolt", "pebble", "bomber", "splitter"],
      blocks: [
        b("stone", 720, 480, 260, 40),
        b("wood", 740, 400, 20, 80),
        b("wood", 940, 400, 20, 80),
        b("wood", 740, 384, 220, 16),
        b("glass", 800, 344, 40, 40),
        b("glass", 860, 344, 40, 40),
        b("wood", 1040, 440, 20, 80),
        b("wood", 1160, 440, 20, 80),
        b("wood", 1040, 424, 140, 16),
      ],
      wisps: [wisp(820, 324), wisp(880, 324), wisp(1100, 404), wisp(1260, 504), wisp(660, 504)],
    },
    {
      name: "The Big Squeeze",
      ammo: ["inflator", "inflator", "pebble", "bolt", "bomber", "boulder"],
      blocks: [
        b("stone", 700, 452, 24, 68),
        b("stone", 1060, 452, 24, 68),
        b("stone", 700, 424, 384, 28),
        b("wood", 760, 384, 20, 40),
        b("wood", 1000, 384, 20, 40),
        b("wood", 760, 366, 260, 18),
        b("glass", 820, 476, 40, 44),
        b("glass", 868, 476, 40, 44),
        b("glass", 916, 476, 40, 44),
      ],
      wisps: [wisp(890, 346), wisp(840, 458), wisp(888, 458), wisp(936, 458), wisp(1180, 504), wisp(650, 504)],
    },
    {
      name: "Fortress Fall",
      ammo: ["boulder", "bomber", "inflator", "splitter", "bubble", "bolt", "pebble"],
      blocks: [
        b("stone", 680, 460, 28, 60),
        b("stone", 760, 460, 28, 60),
        b("stone", 680, 432, 108, 28),
        b("glass", 700, 396, 40, 36),
        b("stone", 860, 380, 24, 140),
        b("stone", 1040, 380, 24, 140),
        b("stone", 860, 356, 204, 24),
        b("wood", 900, 316, 20, 40),
        b("wood", 1000, 316, 20, 40),
        b("wood", 900, 300, 120, 16),
        b("glass", 1120, 472, 40, 48),
        b("glass", 1168, 472, 40, 48),
        b("stone", 1120, 440, 88, 32),
      ],
      wisps: [wisp(720, 376), wisp(960, 280), wisp(950, 500), wisp(1140, 420), wisp(1250, 504), wisp(620, 504)],
    },
    {
      name: "The Wisp King",
      boss: true,
      ammo: ["boulder", "bomber", "inflator", "bolt", "bomber", "boulder", "splitter", "bubble"],
      blocks: [
        b("stone", 880, 476, 300, 44),
        b("stone", 900, 436, 40, 40),
        b("stone", 1120, 436, 40, 40),
        b("stone", 900, 416, 260, 20),
        b("wood", 720, 440, 20, 80),
        b("wood", 800, 440, 20, 80),
        b("wood", 720, 424, 100, 16),
        b("glass", 740, 384, 40, 40),
        b("stone", 1220, 440, 20, 80),
        b("stone", 1300, 440, 20, 80),
        b("stone", 1220, 424, 100, 16),
        b("glass", 1260, 384, 40, 40),
      ],
      wisps: [
        wisp(1030, 372, 42, { hp: 6, boss: true, hue: 315 }),
        wisp(760, 364),
        wisp(1280, 364),
        wisp(680, 504),
        wisp(1360, 504),
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------
  const el = (id) => document.getElementById(id);
  const levelLabel = el("levelLabel");
  const scoreLabel = el("scoreLabel");
  const stonesLabel = el("stonesLabel");
  const powerLabel = el("powerLabel");
  const restartBtn = el("restartBtn");
  const nextBtn = el("nextBtn");
  const muteBtn = el("muteBtn");
  const lookBtn = el("lookBtn");
  const messageEl = el("message");
  const overlay = el("overlay");
  const overlayTitle = el("overlayTitle");
  const overlayStars = el("overlayStars");
  const overlayText = el("overlayText");
  const overlayPrimary = el("overlayPrimary");
  const overlaySecondary = el("overlaySecondary");
  const ammoStrip = el("ammoStrip");
  const abilityHint = el("abilityHint");

  // ---------------------------------------------------------------------------
  // Engine
  // ---------------------------------------------------------------------------
  const engine = Engine.create({
    enableSleeping: true,
    gravity: { x: 0, y: 1, scale: GRAVITY_SCALE },
    positionIterations: 8,
    velocityIterations: 8,
  });
  const world = engine.world;

  const ground = Bodies.rectangle(WORLD_W / 2, GROUND_Y + 80, WORLD_W + 600, 160, {
    isStatic: true, label: "ground", friction: 0.9,
  });
  const leftWall = Bodies.rectangle(-40, H / 2, 80, H * 3, { isStatic: true, label: "wall" });
  const rightWall = Bodies.rectangle(WORLD_W + 40, H / 2, 80, H * 3, { isStatic: true, label: "wall" });
  Composite.add(world, [ground, leftWall, rightWall]);

  const state = {
    levelIndex: 0,
    score: 0,
    ammo: [],
    shotsFired: 0,
    blocks: [],
    wisps: [],
    activeStone: null,
    spentStones: [],
    particles: [],
    floaters: [],
    shockwaves: [],
    trail: [],
    dragging: false,
    dragPos: { x: ANCHOR.x, y: ANCHOR.y },
    power: 0,
    abilityUsed: false,
    reloadTimer: 0,
    settleTimer: 0,
    completeTimer: 0,
    levelComplete: false,
    levelFailed: false,
    stars: 0,
    camera: 0,
    introTimer: 0,
    peek: false,
    shake: 0,
    muted: false,
    time: 0,
  };

  // ---------------------------------------------------------------------------
  // Audio (synthesized only)
  // ---------------------------------------------------------------------------
  let audioCtx = null;
  let noiseBuffer = null;

  function ensureAudio() {
    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) {
        audioCtx = new Ctor();
        noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, duration, type = "sine", gain = 0.06, slideTo = null) {
    if (!audioCtx || state.muted) return;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
    amp.gain.setValueAtTime(gain, audioCtx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(amp); amp.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  }

  function noise(duration, gain, filterFreq) {
    if (!audioCtx || !noiseBuffer || state.muted) return;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const amp = audioCtx.createGain();
    amp.gain.setValueAtTime(gain, audioCtx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    src.connect(filter); filter.connect(amp); amp.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + duration);
  }

  const sfx = {
    launch: () => { tone(300, 0.16, "triangle", 0.05, 120); noise(0.08, 0.02, 900); },
    thud: () => { tone(110, 0.09, "sine", 0.035, 70); },
    wood: () => { noise(0.12, 0.05, 1100); tone(190, 0.1, "square", 0.02, 90); },
    glass: () => { noise(0.18, 0.035, 4200); tone(1400, 0.12, "sine", 0.025, 2600); },
    rock: () => { noise(0.16, 0.055, 650); tone(95, 0.13, "sawtooth", 0.02, 55); },
    pop: () => { tone(720, 0.18, "sine", 0.055, 1320); tone(1080, 0.14, "triangle", 0.025, 1600); },
    blast: () => { noise(0.34, 0.11, 480); tone(70, 0.35, "sawtooth", 0.06, 35); },
    surge: () => { tone(420, 0.2, "sawtooth", 0.04, 900); },
    split: () => { tone(520, 0.13, "triangle", 0.035, 980); tone(660, 0.11, "sine", 0.025, 1200); },
    bubble: () => { tone(300, 0.28, "sine", 0.04, 940); tone(520, 0.22, "triangle", 0.02, 1250); },
    inflate: () => { tone(180, 0.3, "sawtooth", 0.045, 420); tone(90, 0.28, "sine", 0.03, 200); },
    bossHit: () => { tone(260, 0.12, "square", 0.045, 150); noise(0.1, 0.03, 800); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3, "triangle", 0.05), i * 110)); },
    lose: () => { tone(220, 0.35, "sawtooth", 0.045, 90); },
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function bestStarsKey(i) { return `slingstone.best.${i}`; }
  function getBestStars(i) {
    try { return Number(localStorage.getItem(bestStarsKey(i))) || 0; } catch { return 0; }
  }
  function setBestStars(i, stars) {
    try { if (stars > getBestStars(i)) localStorage.setItem(bestStarsKey(i), String(stars)); } catch { /* storage disabled */ }
  }

  // ---------------------------------------------------------------------------
  // Level construction
  // ---------------------------------------------------------------------------
  function clearLevel() {
    const bodies = Composite.allBodies(world);
    for (const body of bodies) {
      if (body !== ground && body !== leftWall && body !== rightWall) Composite.remove(world, body);
    }
    state.blocks = [];
    state.wisps = [];
    state.activeStone = null;
    state.spentStones = [];
    state.particles = [];
    state.floaters = [];
    state.shockwaves = [];
    state.trail = [];
  }

  function addBlock(def) {
    const mat = MATERIALS[def.type];
    const body = Bodies.rectangle(def.x + def.w / 2, def.y + def.h / 2, def.w, def.h, {
      density: mat.density,
      friction: mat.friction,
      frictionStatic: mat.friction * 1.2,
      restitution: mat.restitution,
      sleepThreshold: 45,
      label: `block-${def.type}`,
    });
    body.game = {
      kind: "block", material: def.type, w: def.w, h: def.h,
      hp: mat.hp, maxHp: mat.hp, seed: Math.floor(rand(1, 100000)), dead: false,
    };
    Composite.add(world, body);
    state.blocks.push(body);
    return body;
  }

  function addWisp(def) {
    const isBoss = !!def.boss;
    const body = Bodies.circle(def.x, def.y, def.r, {
      isStatic: isBoss, // the boss holds its ground; only damage brings it down
      density: isBoss ? 0.006 : 0.0016, friction: 0.5, frictionAir: 0.016,
      restitution: 0.42, sleepThreshold: 45, label: "wisp",
    });
    body.game = {
      kind: "wisp", r: def.r, hue: def.hue ?? rand(155, 285), phase: rand(0, 6.28),
      alive: true, hp: def.hp ?? 1, maxHp: def.hp ?? 1, boss: isBoss, hitCooldown: 0,
    };
    Composite.add(world, body);
    state.wisps.push(body);
    return body;
  }

  function loadLevel(index) {
    clearLevel();
    const def = LEVELS[index];
    state.levelIndex = index;
    state.ammo = def.ammo.slice();
    state.shotsFired = 0;
    for (const block of def.blocks) addBlock(block);
    for (const w of def.wisps) addWisp(w);
    state.dragging = false;
    state.power = 0;
    state.abilityUsed = false;
    state.reloadTimer = 0;
    state.settleTimer = 0;
    state.completeTimer = 0;
    state.levelComplete = false;
    state.levelFailed = false;
    state.stars = 0;
    state.camera = 0;
    state.introTimer = 2.6; // brief flyover so the player can see the whole level
    state.peek = false;
    state.shake = 0;
    state.dragPos = { x: ANCHOR.x, y: ANCHOR.y };
    lookBtn.classList.remove("active");
    lookBtn.textContent = "Peek at targets";
    nextBtn.disabled = true;
    overlay.classList.add("hidden");
    messageEl.classList.add("hidden");
    updateHud();
    if (def.boss) showMessage("Boss battle — the armored Wisp King takes several hits to defeat!");
  }

  function currentStoneType() { return state.ammo[0] || null; }

  function updateHud() {
    const def = LEVELS[state.levelIndex];
    levelLabel.textContent = `Level ${state.levelIndex + 1} / ${LEVELS.length} · ${def.name}`;
    scoreLabel.textContent = `Score: ${state.score}`;
    stonesLabel.textContent = `Stones: ${state.ammo.length}`;
    powerLabel.textContent = `Power: ${Math.round(state.power * 100)}%`;

    ammoStrip.innerHTML = def.ammo.map((type, i) => {
      const cls = i < state.shotsFired ? "spent" : (i === state.shotsFired ? "current" : "");
      return `<span class="ammo-chip ${cls}" data-type="${type}" title="${STONE_TYPES[type].name}">${STONE_TYPES[type].glyph}</span>`;
    }).join("");

    const type = currentStoneType();
    abilityHint.innerHTML = state.levelComplete
      ? "Level clear!"
      : state.activeStone && !state.abilityUsed && STONE_TYPES[state.activeStone.type].ability
        ? "<strong>Ability ready!</strong> Click, tap, or press Space now."
        : type ? ABILITY_TEXT[type] : "Out of stones.";
  }

  function showMessage(text) {
    messageEl.textContent = text;
    messageEl.classList.remove("hidden");
  }

  function floater(x, y, text, color = "#fcd34d") {
    state.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  }

  function burst(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x, y,
        vx: rand(opts.vxMin ?? -220, opts.vxMax ?? 220),
        vy: rand(opts.vyMin ?? -280, opts.vyMax ?? -30),
        life: rand(0.35, opts.life ?? 0.85),
        maxLife: opts.life ?? 0.85,
        size: rand(opts.sizeMin ?? 2, opts.sizeMax ?? 6),
        color: opts.colors ? pick(opts.colors) : "#c8b18a",
        spin: rand(-10, 10),
        rot: rand(0, 6.28),
        kind: opts.kind || "chunk",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Damage, destruction, wisps
  // ---------------------------------------------------------------------------
  function damageBlock(body, amount, impactX, impactY) {
    if (!body.game || body.game.dead) return;
    body.game.hp -= amount;
    Sleeping.set(body, false);
    if (body.game.hp > 0) {
      if (amount > 12) burst(impactX, impactY, 4, {
        colors: ["#e8d5b0", "#b89a6a"], sizeMin: 1.5, sizeMax: 3, life: 0.4,
      });
      return;
    }
    breakBlock(body, impactX, impactY);
  }

  function breakBlock(body, x, y) {
    if (!body.game || body.game.dead) return;
    body.game.dead = true;
    const { material, w, h } = body.game;
    const palette = {
      wood: ["#d9a55f", "#a9713a", "#7c4f28", "#e8c188"],
      glass: ["#bff3ff", "#7fd8f0", "#e9fbff", "#4aa8c8"],
      stone: ["#b8c2d0", "#8895a8", "#6b778c", "#d8e0ea"],
    }[material];
    burst(x ?? body.position.x, y ?? body.position.y, material === "glass" ? 22 : 14, {
      colors: palette, sizeMin: 2, sizeMax: Math.min(9, Math.max(w, h) / 5), life: 1.0,
    });
    state.score += MATERIALS[material].score;
    floater(body.position.x, body.position.y - 12, `+${MATERIALS[material].score}`, "#9fe8ff");
    sfx[material === "stone" ? "rock" : material]();
    state.shake = Math.max(state.shake, material === "stone" ? 5 : 3);
    Composite.remove(world, body);
    const idx = state.blocks.indexOf(body);
    if (idx >= 0) state.blocks.splice(idx, 1);
    updateHud();
  }

  function popWisp(wispBody, reason = "hit") {
    if (!wispBody.game || !wispBody.game.alive) return;
    wispBody.game.alive = false;
    const { x, y } = wispBody.position;
    const boss = wispBody.game.boss;
    burst(x, y, boss ? 60 : 26, {
      colors: ["#a5f3fc", "#f0abfc", "#fde68a", "#ffffff"],
      sizeMin: 2, sizeMax: boss ? 8 : 5, life: 0.95, kind: "spark",
      vxMin: -260, vxMax: 260, vyMin: -300, vyMax: 60,
    });
    state.shockwaves.push({ x, y, r: 6, maxR: boss ? 150 : 62, life: 0.5, maxLife: 0.5, color: "#f0abfc" });
    const gain = boss ? 2500 : 500;
    state.score += gain;
    floater(x, y - 20, `+${gain}`, "#fcd34d");
    sfx.pop();
    state.shake = Math.max(state.shake, boss ? 16 : 4);
    Composite.remove(world, wispBody);
    updateHud();
    checkWin();
  }

  // Damage a wisp. Normal wisps pop immediately; a boss loses one or more HP
  // per hit (rate-limited) and only pops when its HP reaches zero.
  function damageWisp(wispBody, amount, reason, rel = 0) {
    if (!wispBody.game || !wispBody.game.alive) return;
    const g = wispBody.game;
    if (!g.boss) { popWisp(wispBody, reason); return; }
    if (g.hitCooldown > 0) return;
    g.hitCooldown = 0.26;
    const dmg = amount ?? (rel > 11 ? 2 : 1);
    g.hp -= dmg;
    const { x, y } = wispBody.position;
    burst(x, y, 12, {
      colors: ["#fbcfe8", "#fde68a", "#ffffff"], kind: "spark",
      vxMin: -180, vxMax: 180, vyMin: -200, vyMax: 40, life: 0.6,
    });
    state.shockwaves.push({ x, y, r: 4, maxR: 46, life: 0.35, maxLife: 0.35, color: "#fbcfe8" });
    state.score += 100;
    floater(x, y - wispBody.game.r - 6, `-${dmg}`, "#fda4af");
    sfx.bossHit();
    state.shake = Math.max(state.shake, 6);
    if (g.hp <= 0) popWisp(wispBody, reason);
  }

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA, c = pair.bodyB;
      const va = Body.getVelocity(a), vc = Body.getVelocity(c);
      const rel = Math.hypot(va.x - vc.x, va.y - vc.y);
      const contact = {
        x: (a.position.x + c.position.x) / 2,
        y: (a.position.y + c.position.y) / 2,
      };

      // Blocks take damage on impact.
      considerBlockDamage(a, c, rel, contact);
      considerBlockDamage(c, a, rel, contact);

      // Wisps pop on a solid hit or a direct strike from the player's stone.
      considerWispPop(a, c, rel);
      considerWispPop(c, a, rel);
    }
  });

  function considerBlockDamage(block, other, rel, contact) {
    if (!block.game || block.game.kind !== "block" || block.game.dead) return;
    if (rel < 2.4) return;
    const otherMass = other.isStatic ? block.mass * 2 : other.mass;
    const eff = Math.min(block.mass, otherMass);
    let factor = 0.075;
    if (other.game && other.game.kind === "stone") {
      // Heavier stones (boulders, fully-inflated inflators) hit much harder.
      const massBoost = clamp((other.mass || 4) / 4, 0.7, 2.6);
      factor = 0.21 * massBoost;
    } else if (other.isStatic) factor = 0.10;
    const dmg = rel * rel * eff * factor;
    damageBlock(block, dmg, contact.x, contact.y);
    if (rel > 6) sfx.thud();
  }

  function considerWispPop(wispBody, other, rel) {
    if (!wispBody.game || wispBody.game.kind !== "wisp" || !wispBody.game.alive) return;
    const directStone = other.game && other.game.kind === "stone" && rel > 1.6;
    if (directStone || rel > 5.2) damageWisp(wispBody, null, directStone ? "hit" : "crushed", rel);
  }

  // ---------------------------------------------------------------------------
  // Shooting and abilities
  // ---------------------------------------------------------------------------
  function pointerToWorld(evt) {
    const rect = canvas.getBoundingClientRect();
    const point = evt.touches ? evt.touches[0] : evt;
    return {
      x: (point.clientX - rect.left) * (W / rect.width) + state.camera,
      y: (point.clientY - rect.top) * (H / rect.height),
    };
  }

  function beginDrag(evt) {
    if (state.levelComplete || state.levelFailed) return;
    if (state.activeStone) {
      if (!state.abilityUsed) activateAbility();
      return;
    }
    // Touching the canvas cancels the flyover/peek and snaps home so the first
    // click always lands on the slingshot rather than on a panned-away view.
    if (state.introTimer > 0 || state.peek || state.camera > 1) {
      state.introTimer = 0;
      state.peek = false;
      state.camera = 0;
      lookBtn.classList.remove("active");
      lookBtn.textContent = "Peek at targets";
    }
    if (state.reloadTimer > 0 || state.ammo.length === 0) return;
    const p = pointerToWorld(evt);
    if (Math.hypot(p.x - ANCHOR.x, p.y - ANCHOR.y) > GRAB_RADIUS) return;
    ensureAudio();
    state.dragging = true;
    state.dragPos = { x: ANCHOR.x, y: ANCHOR.y };
    state.power = 0;
    updateHud();
    evt.preventDefault();
  }

  function moveDrag(evt) {
    if (!state.dragging) return;
    const p = pointerToWorld(evt);
    let dx = p.x - ANCHOR.x, dy = p.y - ANCHOR.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_DRAG) { dx = dx / dist * MAX_DRAG; dy = dy / dist * MAX_DRAG; }
    state.dragPos = {
      x: clamp(ANCHOR.x + dx, 14, WORLD_W - 14),
      y: clamp(ANCHOR.y + dy, 14, GROUND_Y - 22),
    };
    state.power = clamp(Math.hypot(ANCHOR.x - state.dragPos.x, ANCHOR.y - state.dragPos.y) / MAX_DRAG, 0, 1);
    updateHud();
    evt.preventDefault();
  }

  function endDrag(evt) {
    if (!state.dragging) return;
    state.dragging = false;
    const dx = ANCHOR.x - state.dragPos.x;
    const dy = ANCHOR.y - state.dragPos.y;
    if (Math.hypot(dx, dy) < 10) {
      state.power = 0;
      state.dragPos = { x: ANCHOR.x, y: ANCHOR.y };
      updateHud();
      evt.preventDefault();
      return;
    }
    launch(dx, dy);
    evt.preventDefault();
  }

  function launch(dx, dy) {
    const type = state.ammo.shift();
    if (!type) return;
    const spec = STONE_TYPES[type];
    const body = Bodies.circle(state.dragPos.x, state.dragPos.y, spec.r, {
      density: spec.density,
      frictionAir: 0.0016,
      friction: 0.55,
      restitution: 0.42,
      sleepThreshold: 60,
      label: "stone",
    });
    body.game = { kind: "stone", type, r: spec.r };
    Composite.add(world, body);
    const k = LAUNCH_SPEED / MAX_DRAG;
    Body.setVelocity(body, { x: dx * k, y: dy * k });
    Body.setAngularVelocity(body, rand(-0.16, 0.16));
    state.activeStone = { body, type, age: 0, restTime: 0, abilityUsed: false };
    state.shotsFired += 1;
    state.abilityUsed = false;
    state.trail = [];
    state.power = 0;
    state.settleTimer = 0;
    burst(state.dragPos.x, state.dragPos.y, 9, {
      colors: ["#e8d5b0", "#b89a6a"], sizeMin: 1.5, sizeMax: 3.5, life: 0.45,
    });
    sfx.launch();
    updateHud();
  }

  function activateAbility() {
    const s = state.activeStone;
    if (!s || state.abilityUsed || s.age < 0.08) return;
    const spec = STONE_TYPES[s.type];
    if (!spec.ability) return;
    state.abilityUsed = true;
    s.abilityUsed = true;
    const body = s.body;
    const pos = { x: body.position.x, y: body.position.y };
    const vel = Body.getVelocity(body);

    if (spec.ability === "surge") {
      const speed = Math.hypot(vel.x, vel.y) || 1;
      const boost = 1.75;
      Body.setVelocity(body, { x: vel.x * boost, y: vel.y * boost - 1.2 });
      burst(pos.x, pos.y, 22, {
        colors: ["#5eead4", "#a7f3d0", "#ffffff"], kind: "spark",
        vxMin: -200, vxMax: 60, vyMin: -90, vyMax: 90, life: 0.6,
      });
      state.shockwaves.push({ x: pos.x, y: pos.y, r: 8, maxR: 70, life: 0.4, maxLife: 0.4, color: "#5eead4" });
      sfx.surge();
    } else if (spec.ability === "blast") {
      detonate(pos.x, pos.y);
      retireStone(true);
    } else if (spec.ability === "scatter") {
      scatter(pos, vel);
    } else if (spec.ability === "uplift") {
      uplift(pos.x, pos.y);
      retireStone(true);
    } else if (spec.ability === "inflate") {
      s.inflate = 0;
      s.targetScale = 3.6;
      s.baseR = s.body.circleRadius;
      state.shockwaves.push({ x: pos.x, y: pos.y, r: 8, maxR: 90, life: 0.4, maxLife: 0.4, color: "#fb923c" });
      sfx.inflate();
    }
    updateHud();
  }

  // Pink Bubble: release a rising lift that floats nearby blocks and wisps up
  // and off the top of the world. The boss is too heavy to be lifted.
  function uplift(x, y) {
    const R = 155;
    state.shockwaves.push({ x, y, r: 10, maxR: R, life: 0.6, maxLife: 0.6, color: "#ec4899" });
    burst(x, y, 34, {
      colors: ["#f9a8d4", "#fbcfe8", "#ffffff", "#f0abfc"], kind: "bubble",
      vxMin: -90, vxMax: 90, vyMin: -240, vyMax: -70, life: 1.6, sizeMin: 4, sizeMax: 11,
    });
    sfx.bubble();
    for (const bd of Composite.allBodies(world)) {
      if (bd.isStatic) continue;
      const g = bd.game;
      if (g && g.kind === "wisp" && g.boss) continue; // boss is anchored
      const dx = bd.position.x - x, dy = bd.position.y - y;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const falloff = 1 - d / R;
      Sleeping.set(bd, false);
      Body.setVelocity(bd, {
        x: (dx >= 0 ? 1 : -1) * (2 + 3 * falloff),
        y: -(16 + 24 * falloff),
      });
    }
  }

  function detonate(x, y) {
    const R = 138;
    state.shockwaves.push({ x, y, r: 10, maxR: R * 1.15, life: 0.55, maxLife: 0.55, color: "#fbbf24" });
    burst(x, y, 40, {
      colors: ["#fbbf24", "#fb923c", "#fde68a", "#7f1d1d"], kind: "spark",
      vxMin: -380, vxMax: 380, vyMin: -380, vyMax: 220, life: 0.8, sizeMin: 2, sizeMax: 7,
    });
    state.shake = 15;
    sfx.blast();

    const bodies = Composite.allBodies(world);
    for (const bd of bodies) {
      const dx = bd.position.x - x, dy = bd.position.y - y;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const falloff = 1 - d / R;
      // Explosions damage wisps too, including the static boss (no push on it).
      if (bd.game && bd.game.kind === "wisp" && bd.game.alive) {
        damageWisp(bd, 2, "blast");
        continue;
      }
      if (bd.isStatic) continue;
      const nx = d > 0.01 ? dx / d : 0;
      const ny = d > 0.01 ? dy / d : -1;
      Sleeping.set(bd, false);
      Body.applyForce(bd, bd.position, {
        x: nx * bd.mass * 0.055 * falloff,
        y: (ny - 0.45) * bd.mass * 0.055 * falloff,
      });
      if (bd.game && bd.game.kind === "block") damageBlock(bd, 175 * falloff, bd.position.x, bd.position.y);
    }
  }

  function scatter(pos, vel) {
    const s = state.activeStone;
    const baseSpeed = Math.max(8, Math.hypot(vel.x, vel.y));
    const baseAngle = Math.atan2(vel.y, vel.x);
    Composite.remove(world, s.body);
    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + i * 0.32;
      const r = 9;
      const bd = Bodies.circle(pos.x + i * 6, pos.y - Math.abs(i) * 4, r, {
        density: 0.0055, frictionAir: 0.0018, restitution: 0.42, label: "stone",
      });
      bd.game = { kind: "stone", type: "splitter", r };
      Composite.add(world, bd);
      Body.setVelocity(bd, { x: Math.cos(angle) * baseSpeed, y: Math.sin(angle) * baseSpeed });
      state.spentStones.push({ body: bd, type: "splitter", age: 0.9, restTime: 0 });
    }
    state.activeStone = null;
    state.reloadTimer = RELOAD_DELAY;
    burst(pos.x, pos.y, 20, {
      colors: ["#c4b5fd", "#e9d5ff", "#ffffff"], kind: "spark", life: 0.55,
    });
    sfx.split();
  }

  function retireStone(immediate = false) {
    const s = state.activeStone;
    if (!s) return;
    if (immediate) {
      Composite.remove(world, s.body);
    } else {
      state.spentStones.push({ body: s.body, type: s.type, age: STONE_MAX_AGE - 0.6, restTime: 0 });
    }
    state.activeStone = null;
    state.abilityUsed = false;
    state.reloadTimer = RELOAD_DELAY;
    updateHud();
  }

  // ---------------------------------------------------------------------------
  // Simulation step
  // ---------------------------------------------------------------------------
  function updateStone(dt) {
    const s = state.activeStone;
    if (!s) return;
    s.age += dt;
    const pos = s.body.position;
    const vel = Body.getVelocity(s.body);
    const speed = Math.hypot(vel.x, vel.y);

    // Orange Inflator: swell over ~0.4s. Body.scale also grows its mass, so it
    // turns into a heavy crushing ball as it expands.
    if (s.inflate !== undefined && s.inflate < 1) {
      s.inflate = Math.min(1, s.inflate + dt / 0.4);
      const targetScale = 1 + (s.targetScale - 1) * s.inflate;
      const curScale = s.body.circleRadius / s.baseR;
      const k = targetScale / curScale;
      if (k > 1.001) {
        Body.scale(s.body, k, k);
        s.body.game.r = s.body.circleRadius;
      }
    }

    state.trail.push({ x: pos.x, y: pos.y, life: 0.42 });
    if (state.trail.length > 26) state.trail.shift();

    if (pos.y > H + 90 || pos.x < -80 || pos.x > WORLD_W + 80 || s.age > STONE_MAX_AGE) {
      retireStone(true);
      return;
    }
    if (s.age > 0.55 && speed < 1.3) {
      s.restTime += dt;
      if (s.restTime > 0.4) retireStone();
    } else {
      s.restTime = 0;
    }
  }

  function updateSpent(dt) {
    for (let i = state.spentStones.length - 1; i >= 0; i--) {
      const s = state.spentStones[i];
      s.age += dt;
      if (s.age > STONE_MAX_AGE + 0.5 || s.body.position.y > H + 90) {
        Composite.remove(world, s.body);
        state.spentStones.splice(i, 1);
      }
    }
  }

  function updateEffects(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.kind === "bubble") {
        p.vy += -150 * dt;                                   // buoyant, rises
        p.x += Math.sin((p.maxLife - p.life) * 7 + p.rot) * 26 * dt; // gentle wobble
        p.vx *= (1 - 0.6 * dt);
      } else {
        p.vy += (p.kind === "spark" ? 420 : 900) * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i--) {
      const f = state.floaters[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const s = state.shockwaves[i];
      s.life -= dt;
      s.r += (s.maxR - s.r) * Math.min(1, dt * 9);
      if (s.life <= 0) state.shockwaves.splice(i, 1);
    }
    for (let i = state.trail.length - 1; i >= 0; i--) {
      state.trail[i].life -= dt;
      if (state.trail[i].life <= 0) state.trail.splice(i, 1);
    }
    state.shake *= Math.pow(0.02, dt);
    if (state.shake < 0.15) state.shake = 0;
  }

  function updateWispBounds(dt) {
    for (const w of state.wisps) {
      if (!w.game.alive) continue;
      if (w.game.hitCooldown > 0) w.game.hitCooldown = Math.max(0, w.game.hitCooldown - dt);
      const p = w.position;
      // A wisp launched above the top of the world (e.g. by Bubble) is lost.
      if (p.y > H + 70 || p.y < -90 || p.x < -60 || p.x > WORLD_W + 60) popWisp(w, "fell");
    }
  }

  function maxBodySpeed() {
    let max = 0;
    for (const bd of Composite.allBodies(world)) {
      if (bd.isStatic) continue;
      const v = Body.getVelocity(bd);
      max = Math.max(max, Math.hypot(v.x, v.y));
    }
    return max;
  }

  function checkWin() {
    if (state.levelComplete || state.levelFailed) return;
    if (state.wisps.some(w => w.game.alive)) return;
    state.levelComplete = true;
    state.completeTimer = 0.55;
    const leftover = state.ammo.length;
    const total = LEVELS[state.levelIndex].ammo.length;
    state.stars = 1 + (leftover >= 1 ? 1 : 0) + (leftover >= Math.ceil(total / 2) ? 1 : 0);
    state.score += leftover * 250;
    if (leftover > 0) floater(ANCHOR.x + 60, ANCHOR.y - 70, `+${leftover * 250} bonus`, "#6ee7b7");
    setBestStars(state.levelIndex, state.stars);
    nextBtn.disabled = state.levelIndex >= LEVELS.length - 1;
    updateHud();
    sfx.win();
  }

  function checkLoss(dt) {
    if (state.levelComplete || state.levelFailed) return;
    if (state.ammo.length > 0 || state.activeStone || state.reloadTimer > 0) {
      state.settleTimer = 0;
      return;
    }
    if (maxBodySpeed() > 0.85) { state.settleTimer = 0; return; }
    state.settleTimer += dt;
    if (state.settleTimer > 1.1) {
      state.levelFailed = true;
      sfx.lose();
      showOverlay(false);
    }
  }

  function showOverlay(won) {
    const last = state.levelIndex >= LEVELS.length - 1;
    overlayTitle.textContent = won ? (last ? "All levels cleared!" : "Level clear!") : "Out of stones";
    overlayStars.innerHTML = won
      ? [1, 2, 3].map(i => `<span class="star ${i <= state.stars ? "earned" : ""}">★</span>`).join("")
      : "";
    if (won) {
      const best = getBestStars(state.levelIndex);
      overlayText.innerHTML = `You scored <strong>${state.score}</strong> points.<br>` +
        `Best for this level: <strong>${"★".repeat(best)}${"☆".repeat(3 - best)}</strong>` +
        (last ? "<br>Thanks for playing Slingstone!" : "");
      overlayPrimary.textContent = last ? "Play again" : "Next Level";
      overlaySecondary.classList.remove("hidden");
    } else {
      overlayText.innerHTML = `Score so far: <strong>${state.score}</strong>.<br>Try a different angle or use your ability mid-flight.`;
      overlayPrimary.textContent = "Try Again";
      overlaySecondary.classList.add("hidden");
    }
    overlay.classList.remove("hidden");
  }

  function update(dt) {
    state.time += dt;
    if (state.reloadTimer > 0) state.reloadTimer = Math.max(0, state.reloadTimer - dt);
    if (state.introTimer > 0) state.introTimer = Math.max(0, state.introTimer - dt);
    if (state.levelComplete && state.completeTimer > 0) {
      state.completeTimer -= dt;
      if (state.completeTimer <= 0) showOverlay(true);
    }
    updateStone(dt);
    updateSpent(dt);
    updateEffects(dt);
    updateWispBounds(dt);
    checkLoss(dt);

    let target;
    if (state.activeStone) {
      target = clamp(state.activeStone.body.position.x - 400, 0, CAM_MAX);
    } else if (state.levelComplete) {
      target = state.camera;
    } else if (state.peek) {
      target = CAM_MAX;
    } else if (state.introTimer > 0) {
      // Flyover: sweep out to the targets, then come back to the slingshot.
      target = state.introTimer > 1.55 ? CAM_MAX : 0;
    } else {
      target = 0;
    }
    state.camera += (target - state.camera) * Math.min(1, dt * (state.activeStone ? 5.5 : 3.4));
    state.camera = clamp(state.camera, 0, CAM_MAX);
  }

  // ---------------------------------------------------------------------------
  // Rendering - procedural art
  // ---------------------------------------------------------------------------
  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function hillHeight(wx, base, amp, freq, phase) {
    return base - amp * (0.5 + 0.5 * Math.sin(wx * freq + phase))
      - amp * 0.32 * (0.5 + 0.5 * Math.sin(wx * freq * 2.37 + phase * 1.8));
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, "#101b3b");
    g.addColorStop(0.38, "#33497c");
    g.addColorStop(0.72, "#8c6b8e");
    g.addColorStop(1, "#f0a868");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Sun and halo
    const sx = 742 - state.camera * 0.045;
    const sy = 372;
    const halo = ctx.createRadialGradient(sx, sy, 8, sx, sy, 190);
    halo.addColorStop(0, "rgba(255, 226, 160, 0.55)");
    halo.addColorStop(0.45, "rgba(255, 180, 110, 0.18)");
    halo.addColorStop(1, "rgba(255, 180, 110, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sx, sy, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe6ad";
    ctx.beginPath(); ctx.arc(sx, sy, 52, 0, Math.PI * 2); ctx.fill();

    // Stars in the upper sky
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 42; i++) {
      const x = (hash(i + 3) * (W + 200) - state.camera * 0.03) % (W + 200);
      const y = hash(i + 91) * 230;
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(state.time * 1.6 + i));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillRect(x < 0 ? x + W + 200 : x, y, 1.8, 1.8);
    }
    ctx.globalAlpha = 1;

    // Clouds
    for (let i = 0; i < 7; i++) {
      const span = W + 420;
      let cx = (hash(i + 21) * span + state.time * (5 + i * 0.7) - state.camera * 0.12) % span;
      if (cx < 0) cx += span;
      cx -= 180;
      const cy = 60 + hash(i + 55) * 175;
      const s = 0.7 + hash(i + 77) * 0.8;
      ctx.fillStyle = `rgba(255, 226, 210, ${0.07 + hash(i + 12) * 0.09})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 78 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 34 * s, cy - 9 * s, 52 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 40 * s, cy + 4 * s, 46 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHills(parallax, base, amp, freq, phase, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-20, H);
    for (let sx = -20; sx <= W + 20; sx += 10) {
      const wx = sx + state.camera * parallax;
      ctx.lineTo(sx, hillHeight(wx, base, amp, freq, phase));
    }
    ctx.lineTo(W + 20, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround() {
    // Dirt base
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    g.addColorStop(0, "#5b4636");
    g.addColorStop(1, "#2f241d");
    ctx.fillStyle = g;
    ctx.fillRect(0, GROUND_Y, WORLD_W, H - GROUND_Y + 20);

    // Grass lip
    const gg = ctx.createLinearGradient(0, GROUND_Y - 12, 0, GROUND_Y + 14);
    gg.addColorStop(0, "#79b45c");
    gg.addColorStop(1, "#3d6b38");
    ctx.fillStyle = gg;
    ctx.fillRect(0, GROUND_Y - 9, WORLD_W, 20);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, GROUND_Y - 9, WORLD_W, 2);

    // Deterministic pebbles and grass tufts
    for (let i = 0; i < 130; i++) {
      const x = hash(i + 301) * WORLD_W;
      const y = GROUND_Y + 16 + hash(i + 611) * 62;
      ctx.fillStyle = `rgba(0,0,0,${0.1 + hash(i + 801) * 0.16})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + hash(i + 991) * 5, 1.5 + hash(i + 1201) * 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#8bc96a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 90; i++) {
      const x = hash(i + 1501) * WORLD_W;
      ctx.globalAlpha = 0.5 + hash(i + 1701) * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y - 8);
      ctx.lineTo(x - 3, GROUND_Y - 17 - hash(i + 1901) * 7);
      ctx.moveTo(x, GROUND_Y - 8);
      ctx.lineTo(x + 3, GROUND_Y - 15 - hash(i + 2101) * 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSlingshotBack() {
    ctx.strokeStyle = "#3c2415";
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(ANCHOR.x, GROUND_Y + 4);
    ctx.lineTo(ANCHOR.x - 5, ANCHOR.y + 16);
    ctx.lineTo(FORK.left, FORK.y);
    ctx.moveTo(ANCHOR.x, GROUND_Y + 4);
    ctx.lineTo(ANCHOR.x + 5, ANCHOR.y + 16);
    ctx.lineTo(FORK.right, FORK.y);
    ctx.stroke();

    ctx.strokeStyle = "#7c5230";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(ANCHOR.x, GROUND_Y + 2);
    ctx.lineTo(ANCHOR.x - 5, ANCHOR.y + 16);
    ctx.lineTo(FORK.left, FORK.y);
    ctx.moveTo(ANCHOR.x, GROUND_Y + 2);
    ctx.lineTo(ANCHOR.x + 5, ANCHOR.y + 16);
    ctx.lineTo(FORK.right, FORK.y);
    ctx.stroke();

    // Grain
    ctx.strokeStyle = "rgba(50,26,12,0.45)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const off = i * 2.2;
      ctx.beginPath();
      ctx.moveTo(ANCHOR.x - 3 + off, GROUND_Y - 6);
      ctx.quadraticCurveTo(ANCHOR.x - 6 + off, ANCHOR.y + 30, FORK.left + 4 + off, FORK.y + 18);
      ctx.stroke();
    }
  }

  function drawBand() {
    const p = state.dragging ? state.dragPos : ANCHOR;
    const pull = state.dragging ? state.power : 0;
    ctx.strokeStyle = pull > 0.8 ? "#8c3a22" : "#4a2c1b";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(FORK.left, FORK.y);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(FORK.right, FORK.y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,190,140,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(FORK.left, FORK.y - 2);
    ctx.lineTo(p.x, p.y - 2);
    ctx.stroke();

    // Leather pouch
    ctx.fillStyle = "#5b3a22";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2b190e";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawStoneShape(x, y, r, type, angle = 0, alpha = 1) {
    const spec = STONE_TYPES[type] || STONE_TYPES.pebble;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (type === "bomber") {
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.2);
      glow.addColorStop(0, "rgba(251,146,60,0.55)");
      glow.addColorStop(1, "rgba(251,146,60,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
    }

    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.28, spec.color);
    g.addColorStop(1, "#1c2438");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(8,14,28,0.85)";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Speckles
    ctx.fillStyle = "rgba(10,18,34,0.28)";
    for (let i = 0; i < 5; i++) {
      const a = hash(i * 7.3) * 6.28;
      const d = hash(i * 3.7) * r * 0.62;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + hash(i * 5.1) * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glossy highlight for the pink bubble.
    if (type === "bubble") {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.36, r * 0.16, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `bold ${Math.round(r * 1.15)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.glyph, 0, 0.5);
    ctx.restore();
  }

  function drawTrajectory() {
    if (!state.dragging) return;
    const k = LAUNCH_SPEED / MAX_DRAG;
    let vx = (ANCHOR.x - state.dragPos.x) * k;
    let vy = (ANCHOR.y - state.dragPos.y) * k;
    let x = state.dragPos.x, y = state.dragPos.y;
    const air = 0.0016;
    for (let i = 0; i < 100; i++) {
      vx *= (1 - air);
      vy = vy * (1 - air) + STEP_ACCEL;
      x += vx; y += vy;
      if (y > GROUND_Y - 4 || x > WORLD_W) break;
      if (i % 3 !== 0) continue;
      const t = i / 100;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.14, 0.8 - t * 0.75)})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, 3.4 - t * 1.9), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBlocks() {
    for (const bd of state.blocks) {
      const g = bd.game;
      if (g.dead) continue;
      const { w, h, material, seed } = g;
      const dmg = 1 - clamp(g.hp / g.maxHp, 0, 1);
      ctx.save();
      ctx.translate(bd.position.x, bd.position.y);
      ctx.rotate(bd.angle);

      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;

      if (material === "glass") {
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, "rgba(214, 247, 255, 0.86)");
        grad.addColorStop(0.5, "rgba(126, 209, 233, 0.66)");
        grad.addColorStop(1, "rgba(70, 155, 190, 0.82)");
        ctx.fillStyle = grad;
        roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "rgba(235, 253, 255, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 5, h / 2 - 5);
        ctx.lineTo(-w / 2 + 5, -h / 2 + 8);
        ctx.lineTo(w / 2 - 9, -h / 2 + 8);
        ctx.lineTo(w / 2 - 16, h / 2 - 5);
        ctx.closePath();
        ctx.fill();
      } else {
        const colors = material === "wood"
          ? ["#e0b075", "#a8713c", "#6f4522"]
          : ["#c3cddb", "#8e9bb0", "#5d6a80"];
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(0.55, colors[1]);
        grad.addColorStop(1, colors[2]);
        ctx.fillStyle = grad;
        roundRect(-w / 2, -h / 2, w, h, material === "wood" ? 4 : 6);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = material === "wood" ? "#43280f" : "#414d61";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (material === "wood") {
          ctx.strokeStyle = "rgba(60,32,12,0.42)";
          ctx.lineWidth = 1.4;
          const horizontal = w > h;
          const lines = Math.max(2, Math.floor((horizontal ? h : w) / 11));
          for (let i = 1; i <= lines; i++) {
            const t = i / (lines + 1);
            ctx.beginPath();
            if (horizontal) {
              const yy = -h / 2 + h * t;
              ctx.moveTo(-w / 2 + 4, yy);
              ctx.bezierCurveTo(-w / 6, yy + 2, w / 6, yy - 2, w / 2 - 4, yy);
            } else {
              const xx = -w / 2 + w * t;
              ctx.moveTo(xx, -h / 2 + 4);
              ctx.bezierCurveTo(xx + 2, -h / 6, xx - 2, h / 6, xx, h / 2 - 4);
            }
            ctx.stroke();
          }
          ctx.fillStyle = "#3d2611";
          for (const [nx, ny] of [[-0.34, -0.32], [0.34, -0.32], [-0.34, 0.32], [0.34, 0.32]]) {
            ctx.beginPath(); ctx.arc(nx * w, ny * h, 1.8, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          ctx.fillStyle = "rgba(30,40,58,0.28)";
          for (let i = 0; i < 7; i++) {
            const px = (hash(seed + i * 3.1) - 0.5) * (w - 10);
            const py = (hash(seed + i * 7.7) - 0.5) * (h - 10);
            ctx.beginPath();
            ctx.arc(px, py, 1 + hash(seed + i * 11.3) * 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Damage cracks
      if (dmg > 0.18) {
        ctx.strokeStyle = `rgba(20,14,10,${0.35 + dmg * 0.5})`;
        ctx.lineWidth = 1.2 + dmg;
        const cracks = Math.ceil(dmg * 4);
        for (let i = 0; i < cracks; i++) {
          const a = hash(seed + i * 13.7) * 6.28;
          const sx = Math.cos(a) * w * 0.1;
          const sy = Math.sin(a) * h * 0.1;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(a) * w * 0.24, sy + Math.sin(a) * h * 0.24);
          ctx.lineTo(sx + Math.cos(a + 0.7) * w * 0.36, sy + Math.sin(a + 0.7) * h * 0.36);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function drawWisps() {
    for (const bd of state.wisps) {
      const g = bd.game;
      if (!g.alive) continue;
      const { x, y } = bd.position;
      const pulse = 1 + Math.sin(state.time * 3.4 + g.phase) * 0.09;
      const r = g.r * pulse;

      const glow = ctx.createRadialGradient(x, y, 2, x, y, r * 3.1);
      glow.addColorStop(0, `hsla(${g.hue}, 100%, 88%, 0.95)`);
      glow.addColorStop(0.35, `hsla(${g.hue}, 95%, 68%, 0.55)`);
      glow.addColorStop(1, `hsla(${g.hue}, 90%, 60%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, r * 3.1, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(state.time * 0.7 + g.phase);
      ctx.strokeStyle = `hsla(${g.hue}, 100%, 82%, 0.7)`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const core = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r);
      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.45, `hsl(${g.hue}, 95%, 78%)`);
      core.addColorStop(1, `hsl(${g.hue}, 80%, 52%)`);
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (g.boss) {
        // Rotating armored ring around the boss.
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-state.time * 0.6);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI * 2) / 10;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12);
          ctx.lineTo(Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(253,224,71,0.5)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Crown
        const cy = y - r * 1.55;
        ctx.fillStyle = "#fcd34d";
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.72, cy + 6);
        ctx.lineTo(x - r * 0.72, cy - 7);
        ctx.lineTo(x - r * 0.36, cy + 1);
        ctx.lineTo(x, cy - 13);
        ctx.lineTo(x + r * 0.36, cy + 1);
        ctx.lineTo(x + r * 0.72, cy - 7);
        ctx.lineTo(x + r * 0.72, cy + 6);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Eyes
        ctx.fillStyle = "rgba(24,10,32,0.85)";
        for (const ex of [-0.3, 0.3]) {
          ctx.beginPath(); ctx.arc(x + ex * r, y - r * 0.04, r * 0.13, 0, Math.PI * 2); ctx.fill();
        }
      }

      for (let i = 0; i < 3; i++) {
        const a = state.time * 1.9 + g.phase + (i * Math.PI * 2) / 3;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawTrail() {
    for (const p of state.trail) {
      const a = clamp(p.life / 0.42, 0, 1);
      ctx.fillStyle = `rgba(255, 236, 190, ${a * 0.42})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2 + a * 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawStones() {
    for (const s of state.spentStones) {
      drawStoneShape(s.body.position.x, s.body.position.y, s.body.game.r, s.type, s.body.angle, 0.85);
    }
    if (state.activeStone) {
      const bd = state.activeStone.body;
      const t = state.activeStone.type;
      if (!state.abilityUsed && (t === "bomber" || t === "bubble" || t === "inflator")) {
        const rgb = t === "bubble" ? "236,72,153" : t === "inflator" ? "251,146,60" : "255,180,80";
        const pulse = 0.5 + 0.5 * Math.sin(state.time * 12);
        ctx.strokeStyle = `rgba(${rgb},${0.35 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bd.position.x, bd.position.y, bd.game.r + 7 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
      }
      drawStoneShape(bd.position.x, bd.position.y, bd.game.r, t, bd.angle);
    } else if (!state.levelFailed && !state.levelComplete && state.ammo.length > 0 && state.reloadTimer <= 0) {
      const p = state.dragging ? state.dragPos : ANCHOR;
      drawStoneShape(p.x, p.y, STONE_TYPES[currentStoneType()].r, currentStoneType());
    }
  }

  function drawEffects() {
    for (const s of state.shockwaves) {
      const a = clamp(s.life / s.maxLife, 0, 1);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = a * 0.75;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === "bubble") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size * (0.6 + a * 0.4)), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, Math.max(0.6, p.size * 0.2), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    for (const f of state.floaters) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 6;
      ctx.fillText(f.text, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  function drawPowerGauge() {
    if (!state.dragging) return;
    const x = ANCHOR.x - 46, y = GROUND_Y - 28;
    ctx.fillStyle = "rgba(6,10,24,0.55)";
    roundRect(x, y, 92, 10, 5); ctx.fill();
    const col = state.power > 0.82 ? "#fbbf24" : state.power > 0.5 ? "#6ee7b7" : "#7dd3fc";
    ctx.fillStyle = col;
    roundRect(x + 2, y + 2, Math.max(2, 88 * state.power), 6, 3); ctx.fill();
  }

  function drawAbilityPrompt() {
    const s = state.activeStone;
    if (!s || state.abilityUsed || !STONE_TYPES[s.type].ability) return;
    const p = s.body.position;
    const pulse = 0.55 + 0.45 * Math.sin(state.time * 8);
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.fillStyle = "#0b1020";
    roundRect(p.x - 64, p.y - 52, 128, 26, 13); ctx.fill();
    ctx.strokeStyle = "#fcd34d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fcd34d";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CLICK / SPACE", p.x, p.y - 34);
    ctx.globalAlpha = 1;
  }

  function drawBossBar() {
    const boss = state.wisps.find(w => w.game.boss && w.game.alive);
    if (!boss) return;
    const barW = 340, x = (W - barW) / 2, y = 26;
    ctx.fillStyle = "rgba(6,10,24,0.72)";
    roundRect(x - 14, y - 14, barW + 28, 46, 12); ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("WISP KING", x, y + 1);
    const ratio = clamp(boss.game.hp / boss.game.maxHp, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    roundRect(x, y + 9, barW, 12, 6); ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = ratio > 0.5 ? "#f472b6" : "#fbbf24";
      roundRect(x, y + 9, Math.max(6, barW * ratio), 12, 6); ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawHills(0.16, 430, 96, 0.0042, 0.8, "#3a456b");
    drawHills(0.30, 468, 74, 0.0061, 2.7, "#3f5c63");
    drawHills(0.48, 496, 52, 0.0089, 4.1, "#33544a");

    const sx = state.shake > 0 ? rand(-state.shake, state.shake) : 0;
    const sy = state.shake > 0 ? rand(-state.shake, state.shake) : 0;
    ctx.save();
    ctx.translate(-state.camera + sx, sy);
    drawGround();
    drawTrajectory();
    drawBlocks();
    drawWisps();
    drawTrail();
    drawEffects();
    drawSlingshotBack();
    drawStones();
    drawBand();
    drawPowerGauge();
    drawAbilityPrompt();
    ctx.restore();

    // Subtle vignette on top of everything
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(4,8,20,0.42)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    drawBossBar();
  }

  // ---------------------------------------------------------------------------
  // Main loop - fixed physics timestep
  // ---------------------------------------------------------------------------
  let lastTime = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      Engine.update(engine, STEP_MS);
      update(STEP);
      acc -= STEP;
      guard++;
    }
    if (guard >= 5) acc = 0;
    draw();
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  canvas.addEventListener("mousedown", beginDrag);
  canvas.addEventListener("mousemove", moveDrag);
  window.addEventListener("mouseup", endDrag);
  canvas.addEventListener("touchstart", beginDrag, { passive: false });
  canvas.addEventListener("touchmove", moveDrag, { passive: false });
  window.addEventListener("touchend", endDrag, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      ensureAudio();
      if (state.activeStone && !state.abilityUsed) activateAbility();
    } else if (e.key === "r" || e.key === "R") {
      ensureAudio(); loadLevel(state.levelIndex);
    } else if ((e.key === "n" || e.key === "N") && !nextBtn.disabled) {
      ensureAudio(); loadLevel(state.levelIndex + 1);
    } else if (e.key === "m" || e.key === "M") {
      toggleMute();
    } else if (e.key === "v" || e.key === "V") {
      state.introTimer = 0;
      setPeek(!state.peek);
    }
  });

  window.addEventListener("keyup", (e) => {
    if ((e.key === "v" || e.key === "V") && !state.activeStone) setPeek(false);
  });

  function setPeek(on) {
    state.peek = on;
    lookBtn.classList.toggle("active", on);
    lookBtn.textContent = on ? "Viewing targets…" : "Peek at targets";
  }

  lookBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.introTimer = 0;
    setPeek(true);
  });
  for (const type of ["pointerup", "pointerleave", "pointercancel"]) {
    lookBtn.addEventListener(type, () => setPeek(false));
  }

  function toggleMute() {
    state.muted = !state.muted;
    muteBtn.textContent = `Sound: ${state.muted ? "off" : "on"}`;
    muteBtn.setAttribute("aria-pressed", String(state.muted));
    if (!state.muted) { ensureAudio(); tone(660, 0.1, "sine", 0.04); }
  }

  restartBtn.addEventListener("click", () => { ensureAudio(); loadLevel(state.levelIndex); });
  muteBtn.addEventListener("click", toggleMute);
  nextBtn.addEventListener("click", () => {
    if (state.levelIndex < LEVELS.length - 1) { ensureAudio(); loadLevel(state.levelIndex + 1); }
  });
  overlayPrimary.addEventListener("click", () => {
    ensureAudio();
    if (state.levelComplete) {
      loadLevel(state.levelIndex < LEVELS.length - 1 ? state.levelIndex + 1 : 0);
    } else {
      loadLevel(state.levelIndex);
    }
  });
  overlaySecondary.addEventListener("click", () => { ensureAudio(); loadLevel(state.levelIndex); });

  loadLevel(0);
  requestAnimationFrame(loop);

  // Opt-in hook for the headless Node regression tests.
  if (globalThis.__SLINGSTONE_TEST__) {
    globalThis.__slingstone = {
      state, engine, world, LEVELS, STONE_TYPES,
      loadLevel, activateAbility, popWisp, damageWisp, launch, uplift, detonate,
      bodies: () => Composite.allBodies(world),
      toggleMute,
    };
  }
})();
