/*
 * Slingstone - original physics puzzle game.
 * Copyright (c) 2026 rubiidev18alt
 * Licensed under the MIT License. See LICENSE.
 *
 * All graphics are drawn procedurally with Canvas 2D.
 * All sounds are synthesized with the Web Audio API.
 * No third-party game assets are used.
 */

(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = 540;
  const GRAVITY = 900; // px per second^2
  const MAX_DRAG = 120;
  const LAUNCH_POWER = 8.0; // max launch speed = MAX_DRAG * LAUNCH_POWER = 960 px/s
  const STONE_RADIUS = 13;
  const GRAB_RADIUS = 110;
  const STONE_RETIRE_DELAY = 0.35; // seconds a spent stone lingers before the next one loads
  const STONE_MAX_AGE = 3.5;

  const levelLabel = document.getElementById("levelLabel");
  const scoreLabel = document.getElementById("scoreLabel");
  const shotsLabel = document.getElementById("shotsLabel");
  const powerLabel = document.getElementById("powerLabel");
  const restartBtn = document.getElementById("restartBtn");
  const nextBtn = document.getElementById("nextBtn");
  const messageEl = document.getElementById("message");

  const LEVELS = [
    {
      shots: 5,
      crates: [
        { x: 560, y: 492, w: 48, h: 48 },
        { x: 560, y: 444, w: 48, h: 48 },
        { x: 560, y: 396, w: 48, h: 48 },
      ],
      orbs: [{ x: 584, y: 366, r: 18 }],
    },
    {
      shots: 6,
      crates: [
        { x: 520, y: 492, w: 48, h: 48 },
        { x: 568, y: 492, w: 48, h: 48 },
        { x: 616, y: 492, w: 48, h: 48 },
        { x: 544, y: 444, w: 48, h: 48 },
        { x: 592, y: 444, w: 48, h: 48 },
        { x: 568, y: 396, w: 48, h: 48 },
      ],
      orbs: [
        { x: 568, y: 366, r: 18 },
        { x: 640, y: 468, r: 18 },
      ],
    },
    {
      shots: 7,
      crates: [
        { x: 500, y: 492, w: 44, h: 44 },
        { x: 544, y: 492, w: 44, h: 44 },
        { x: 588, y: 492, w: 44, h: 44 },
        { x: 632, y: 492, w: 44, h: 44 },
        { x: 522, y: 448, w: 44, h: 44 },
        { x: 566, y: 448, w: 44, h: 44 },
        { x: 610, y: 448, w: 44, h: 44 },
        { x: 544, y: 404, w: 44, h: 44 },
        { x: 588, y: 404, w: 44, h: 44 },
        { x: 566, y: 360, w: 44, h: 44 },
      ],
      orbs: [
        { x: 566, y: 330, r: 18 },
        { x: 654, y: 470, r: 18 },
        { x: 488, y: 470, r: 18 },
      ],
    },
  ];

  const state = {
    levelIndex: 0,
    score: 0,
    shotsLeft: 0,
    crates: [],
    orbs: [],
    stone: null,
    particles: [],
    dragging: false,
    dragPos: { x: 0, y: 0 },
    levelComplete: false,
    levelFailed: false,
    settleTimer: 0,
    stoneRetireTimer: 0,
    power: 0,
    message: "",
  };

  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, duration, type = "sine", gain = 0.06) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    amp.gain.setValueAtTime(gain, audioCtx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function makeCrate(def) {
    return {
      x: def.x, y: def.y, w: def.w, h: def.h,
      vx: 0, vy: 0,
      color: `hsl(${rand(24, 38)}, 55%, ${rand(38, 52)}%)`,
      settled: false,
    };
  }

  function makeOrb(def) {
    return {
      x: def.x, y: def.y, r: def.r,
      hue: rand(150, 280),
      phase: rand(0, Math.PI * 2),
      alive: true,
    };
  }

  function loadLevel(index) {
    const def = LEVELS[index];
    state.levelIndex = index;
    state.shotsLeft = def.shots;
    state.crates = def.crates.map(makeCrate);
    state.orbs = def.orbs.map(makeOrb);
    state.stone = null;
    state.particles = [];
    state.dragging = false;
    state.levelComplete = false;
    state.levelFailed = false;
    state.settleTimer = 0;
    state.stoneRetireTimer = 0;
    state.power = 0;
    state.message = "";
    nextBtn.disabled = true;
    messageEl.classList.add("hidden");
    updateHud();
  }

  function updateHud() {
    levelLabel.textContent = `Level ${state.levelIndex + 1} / ${LEVELS.length}`;
    scoreLabel.textContent = `Score: ${state.score}`;
    shotsLabel.textContent = `Shots: ${state.shotsLeft}`;
    if (powerLabel) powerLabel.textContent = `Power: ${Math.round(state.power * 100)}%`;
  }

  function showMessage(text) {
    state.message = text;
    messageEl.textContent = text;
    messageEl.classList.remove("hidden");
  }

  function spawnParticles(x, y, count, hue) {
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x, y,
        vx: rand(-160, 160),
        vy: rand(-220, -40),
        life: rand(0.4, 0.9),
        maxLife: 0.9,
        size: rand(2, 5),
        hue,
      });
    }
  }

  function pointerToCanvas(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const point = evt.touches ? evt.touches[0] : evt;
    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY,
    };
  }

  function anchor() {
    return { x: 150, y: 430 };
  }

  function beginDrag(evt) {
    if (state.levelComplete || state.levelFailed) return;
    if (state.shotsLeft <= 0 || state.stone) return;
    const p = pointerToCanvas(evt);
    const a = anchor();
    const dist = Math.hypot(p.x - a.x, p.y - a.y);
    if (dist <= GRAB_RADIUS) {
      ensureAudio();
      state.dragging = true;
      state.power = 0;
      state.dragPos = { x: a.x, y: a.y };
      updateHud();
      evt.preventDefault();
    }
  }

  function moveDrag(evt) {
    if (!state.dragging) return;
    const p = pointerToCanvas(evt);
    const a = anchor();
    let dx = p.x - a.x;
    let dy = p.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_DRAG) {
      dx = (dx / dist) * MAX_DRAG;
      dy = (dy / dist) * MAX_DRAG;
    }
    // Keep the pouch on screen so a full pull never disappears below the ground.
    let x = clamp(a.x + dx, 12, W - 12);
    let y = clamp(a.y + dy, 12, GROUND_Y - 18);
    state.dragPos = { x, y };
    state.power = clamp(Math.hypot(a.x - x, a.y - y) / MAX_DRAG, 0, 1);
    updateHud();
    evt.preventDefault();
  }

  function endDrag(evt) {
    if (!state.dragging) return;
    state.dragging = false;
    const a = anchor();
    const dx = a.x - state.dragPos.x;
    const dy = a.y - state.dragPos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      state.power = 0;
      updateHud();
      evt.preventDefault();
      return;
    }
    state.stone = {
      x: state.dragPos.x,
      y: state.dragPos.y,
      vx: dx * LAUNCH_POWER,
      vy: dy * LAUNCH_POWER,
      r: STONE_RADIUS,
      active: true,
      age: 0,
      restTime: 0,
    };
    state.shotsLeft -= 1;
    state.settleTimer = 0;
    state.stoneRetireTimer = 0;
    state.power = 0;
    updateHud();
    tone(220, 0.12, "triangle", 0.05);
    evt.preventDefault();
  }

  function circleRectCollide(cx, cy, r, rect) {
    const closestX = clamp(cx, rect.x, rect.x + rect.w);
    const closestY = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return { hit: dx * dx + dy * dy <= r * r, dx, dy, dist: Math.hypot(dx, dy) };
  }

  function updateStone(dt) {
    const s = state.stone;
    if (!s || !s.active) return;
    s.age += dt;
    s.hitCooldown = Math.max(0, (s.hitCooldown || 0) - dt);
    s.vy += GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    // Ground
    let onGround = false;
    if (s.y + s.r > GROUND_Y) {
      s.y = GROUND_Y - s.r;
      if (s.vy > 60) tone(120, 0.08, "sine", 0.03);
      s.vy *= -0.35;
      s.vx *= 0.7;
      onGround = true;
    }

    // A stone that has come to rest is retired instead of lingering invisibly.
    if (onGround && Math.abs(s.vy) < 45 && Math.abs(s.vx) < 45) {
      s.restTime += dt;
    } else {
      s.restTime = 0;
    }
    if (s.restTime > 0.3 || s.age > STONE_MAX_AGE) {
      s.active = false;
    }

    // Orbs
    for (const orb of state.orbs) {
      if (!orb.alive) continue;
      const dx = s.x - orb.x;
      const dy = s.y - orb.y;
      if (Math.hypot(dx, dy) < s.r + orb.r) {
        orb.alive = false;
        state.score += 100;
        spawnParticles(orb.x, orb.y, 18, orb.hue);
        tone(660, 0.16, "square", 0.05);
        updateHud();
      }
    }

    // Crates
    for (const c of state.crates) {
      const col = circleRectCollide(s.x, s.y, s.r, c);
      if (!col.hit) continue;
      let nx = col.dx;
      let ny = col.dy;
      if (col.dist < 0.001) {
        nx = s.x - (c.x + c.w / 2);
        ny = s.y - (c.y + c.h / 2);
        const n = Math.hypot(nx, ny) || 1;
        nx /= n; ny /= n;
      } else {
        nx /= col.dist; ny /= col.dist;
      }
      // push stone out
      s.x += nx * (s.r - col.dist + 0.5);
      s.y += ny * (s.r - col.dist + 0.5);
      // reflect velocity
      const dot = s.vx * nx + s.vy * ny;
      s.vx = (s.vx - 2 * dot * nx) * 0.55;
      s.vy = (s.vy - 2 * dot * ny) * 0.55;
      // impulse to crate (capped so a fast stone does not launch crates off-screen)
      c.vx += clamp(s.vx * 0.3, -420, 420);
      c.vy += clamp(s.vy * 0.3, -420, 420) - 60;
      c.settled = false;
      if (s.hitCooldown === 0) {
        spawnParticles(s.x, s.y, 8, 35);
        tone(180, 0.07, "sawtooth", 0.025);
        s.hitCooldown = 0.09;
      }
    }

    // Off screen / expired
    if (s.x > W + 100 || s.x < -100 || s.y > H + 100 || s.age > STONE_MAX_AGE) {
      s.active = false;
    }
  }

  function updateCrates(dt) {
    for (const c of state.crates) {
      if (c.settled) continue;
      c.vy += GRAVITY * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      if (c.y + c.h > GROUND_Y) {
        c.y = GROUND_Y - c.h;
        c.vy = 0;
        c.vx *= 0.82;
      }

      // Keep knocked crates inside the playfield.
      if (c.x < 8) { c.x = 8; c.vx = Math.abs(c.vx) * 0.35; }
      if (c.x + c.w > W - 8) { c.x = W - 8 - c.w; c.vx = -Math.abs(c.vx) * 0.35; }

    }

    // Crate-crate separation. No extra "fudge" push: the previous +0.5 px
    // applied every frame slowly levitated stacked crates into the orbs.
    for (let i = 0; i < state.crates.length; i++) {
      for (let j = i + 1; j < state.crates.length; j++) {
        const a = state.crates[i];
        const b = state.crates[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox <= 0.5 || oy <= 0.5) continue;
        if (ox < oy) {
          const push = ox / 2;
          if (a.x < b.x) { a.x -= push; b.x += push; }
          else { a.x += push; b.x -= push; }
          const tmp = a.vx; a.vx = b.vx * 0.5; b.vx = tmp * 0.5;
          a.settled = false; b.settled = false;
        } else {
          const push = oy / 2;
          if (a.y < b.y) { a.y -= push; b.y += push; }
          else { a.y += push; b.y -= push; }
          const tmp = a.vy; a.vy = b.vy * 0.5; b.vy = tmp * 0.5;
          a.settled = false; b.settled = false;
        }
      }
    }

    // Snap resting crates onto their support (ground or another crate) and wake
    // any crate whose support was knocked away.
    for (const c of state.crates) {
      let support = GROUND_Y;
      for (const o of state.crates) {
        if (o === c) continue;
        const ox = Math.min(c.x + c.w, o.x + o.w) - Math.max(c.x, o.x);
        const gap = o.y - (c.y + c.h);
        if (ox > 4 && gap > -12 && gap < 12 && o.y < support) support = o.y;
      }
      const gap = support - (c.y + c.h);
      if (gap > -2 && gap < 6) {
        if (c.vy > 0) {
          c.y = support - c.h;
          c.vy = 0;
        }
        if (Math.abs(c.vx) < 4) {
          c.vx = 0;
          c.settled = true;
        }
      } else if (gap >= 6) {
        c.settled = false;
      }
    }

    // Any crate touching an orb pops it, whether settled or flying.
    for (const c of state.crates) {
      for (const orb of state.orbs) {
        if (!orb.alive) continue;
        if (!circleRectCollide(orb.x, orb.y, orb.r, c).hit) continue;
        orb.alive = false;
        state.score += 100;
        spawnParticles(orb.x, orb.y, 18, orb.hue);
        tone(660, 0.16, "square", 0.05);
        updateHud();
      }
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      p.vy += GRAVITY * 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function cratesAtRest() {
    return state.crates.every(c => Math.abs(c.vx) < 12 && Math.abs(c.vy) < 12);
  }

  function checkWinLoss(dt) {
    if (state.levelComplete || state.levelFailed) return;
    const remaining = state.orbs.filter(o => o.alive).length;
    if (remaining === 0) {
      state.levelComplete = true;
      nextBtn.disabled = state.levelIndex >= LEVELS.length - 1;
      showMessage(`Level ${state.levelIndex + 1} complete! Score: ${state.score}`);
      tone(880, 0.25, "triangle", 0.06);
      return;
    }

    // Retire a spent stone so the slingshot can load the next one. Without this
    // the old stone object stayed in state forever and blocked every later shot.
    if (state.stone && !state.stone.active) {
      state.stoneRetireTimer += dt;
      if (state.stoneRetireTimer >= STONE_RETIRE_DELAY) {
        state.stone = null;
        state.stoneRetireTimer = 0;
        state.settleTimer = 0;
      }
    }

    if (!state.stone) {
      state.settleTimer += dt;
      if (state.shotsLeft <= 0 && state.settleTimer > 1.2 && cratesAtRest()) {
        state.levelFailed = true;
        showMessage("Out of stones! Press Restart to try again.");
        tone(140, 0.3, "sawtooth", 0.05);
      }
    } else {
      state.settleTimer = 0;
    }
  }

  function update(dt) {
    updateStone(dt);
    updateCrates(dt);
    updateParticles(dt);
    checkWinLoss(dt);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawBackground(t) {
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, "#8ec5ff");
    grad.addColorStop(1, "#dff1ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // sun
    ctx.fillStyle = "rgba(255, 236, 170, 0.95)";
    ctx.beginPath();
    ctx.arc(820, 90, 46, 0, Math.PI * 2);
    ctx.fill();

    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 4; i++) {
      const cx = ((t * 8 + i * 260) % (W + 200)) - 100;
      const cy = 70 + (i % 2) * 55;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy - 10, 34, 0, Math.PI * 2);
      ctx.arc(cx + 65, cy, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    // hills
    ctx.fillStyle = "#79b86b";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(180, 430, 360, GROUND_Y);
    ctx.quadraticCurveTo(560, 470, 760, GROUND_Y);
    ctx.quadraticCurveTo(880, 460, W, GROUND_Y);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // ground
    ctx.fillStyle = "#5b8c4a";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let x = 0; x < W; x += 40) {
      ctx.fillRect(x, GROUND_Y + 10, 20, 3);
    }
  }

  function drawSlingshot() {
    const a = anchor();
    // base
    ctx.strokeStyle = "#6b4423";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, GROUND_Y);
    ctx.lineTo(a.x - 8, a.y + 10);
    ctx.lineTo(a.x - 28, a.y - 44);
    ctx.moveTo(a.x, GROUND_Y);
    ctx.lineTo(a.x + 8, a.y + 10);
    ctx.lineTo(a.x + 28, a.y - 44);
    ctx.stroke();

    // pouch / band
    const p = state.dragging ? state.dragPos : a;
    ctx.strokeStyle = state.dragging && state.power > 0.8 ? "#7a3a1c" : "#3f2a18";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(a.x - 28, a.y - 44);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(a.x + 28, a.y - 44);
    ctx.stroke();

    // Power gauge while aiming.
    if (state.dragging) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(a.x - 42, GROUND_Y - 24, 84, 9);
      ctx.fillStyle = state.power > 0.8 ? "#fcd34d" : "#6ee7b7";
      ctx.fillRect(a.x - 40, GROUND_Y - 22, 80 * state.power, 5);
    }

    if (!state.stone && !state.levelFailed && !state.levelComplete && state.shotsLeft > 0) {
      ctx.fillStyle = "#4b5563";
      ctx.beginPath();
      ctx.arc(p.x, p.y, STONE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawTrajectory() {
    if (!state.dragging) return;
    const a = anchor();
    const p = state.dragPos;
    let vx = (a.x - p.x) * LAUNCH_POWER;
    let vy = (a.y - p.y) * LAUNCH_POWER;
    let x = p.x;
    let y = p.y;
    const step = 0.035;
    for (let i = 0; i < 34; i++) {
      x += vx * step;
      y += vy * step;
      vy += GRAVITY * step;
      if (y > GROUND_Y || x > W + 20) break;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.12, 0.65 - i * 0.016)})`;
      ctx.beginPath();
      ctx.arc(x, y, 3.2 - i * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCrates() {
    for (const c of state.crates) {
      ctx.save();
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
      ctx.fillStyle = c.color;
      ctx.strokeStyle = "#3b2412";
      ctx.lineWidth = 3;
      roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-c.w / 2 + 4, -c.h / 2 + 4);
      ctx.lineTo(c.w / 2 - 4, c.h / 2 - 4);
      ctx.moveTo(c.w / 2 - 4, -c.h / 2 + 4);
      ctx.lineTo(-c.w / 2 + 4, c.h / 2 - 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawOrbs(t) {
    for (const o of state.orbs) {
      if (!o.alive) continue;
      const pulse = 1 + Math.sin(t * 4 + o.phase) * 0.08;
      const r = o.r * pulse;
      const glow = ctx.createRadialGradient(o.x, o.y, 2, o.x, o.y, r * 2.2);
      glow.addColorStop(0, `hsla(${o.hue}, 90%, 75%, 0.95)`);
      glow.addColorStop(0.5, `hsla(${o.hue}, 85%, 60%, 0.55)`);
      glow.addColorStop(1, `hsla(${o.hue}, 85%, 60%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsl(${o.hue}, 85%, 65%)`;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(o.x - r * 0.3, o.y - r * 0.3, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStone() {
    const s = state.stone;
    if (!s || !s.active) return;
    ctx.fillStyle = "#4b5563";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(s.x - 4, s.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw(t) {
    drawBackground(t);
    drawTrajectory();
    drawCrates();
    drawOrbs(t);
    drawParticles();
    drawStone();
    drawSlingshot();
  }

  let lastTime = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    draw(now / 1000);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("mousedown", beginDrag);
  canvas.addEventListener("mousemove", moveDrag);
  window.addEventListener("mouseup", endDrag);
  canvas.addEventListener("touchstart", beginDrag, { passive: false });
  canvas.addEventListener("touchmove", moveDrag, { passive: false });
  window.addEventListener("touchend", endDrag, { passive: false });

  restartBtn.addEventListener("click", () => {
    ensureAudio();
    loadLevel(state.levelIndex);
  });

  nextBtn.addEventListener("click", () => {
    if (state.levelIndex < LEVELS.length - 1) {
      ensureAudio();
      loadLevel(state.levelIndex + 1);
    } else {
      showMessage("You finished all levels! Final score: " + state.score);
    }
  });

  loadLevel(0);
  requestAnimationFrame(loop);
})();
