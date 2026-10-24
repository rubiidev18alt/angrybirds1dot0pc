#!/usr/bin/env node
/*
 * Headless regression tests for Slingstone (Matter.js edition).
 *
 * Runs game.js against a stub DOM/canvas so the real physics engine, game loop,
 * and input handlers execute without a browser.
 *
 * Usage: node tools/test_game.js
 */

"use strict";

const path = require("path");

const CANVAS_W = 960;
const CANVAS_H = 600;
const ANCHOR = { x: 190, y: 396 };

// ---------------------------------------------------------------------------
// Minimal browser stubs
// ---------------------------------------------------------------------------
let clock = 0;
let rafCallback = null;
const windowHandlers = {};
const storage = new Map();

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, {
  get(target, key) {
    if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
    if (key === "measureText") return () => ({ width: 10 });
    if (key in target) return target[key];
    return () => {};
  },
  set(target, key, value) { target[key] = value; return true; },
});

function makeElement(id) {
  const handlers = {};
  const classes = new Set(id === "overlay" || id === "message" ? ["hidden"] : []);
  return {
    id,
    textContent: "",
    innerHTML: "",
    disabled: false,
    handlers,
    classes,
    attrs: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !classes.has(c) : force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      },
    },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(type, fn) { handlers[type] = fn; },
    click() { if (handlers.click) handlers.click({ preventDefault() {} }); },
    getContext() { return ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, width: CANVAS_W, height: CANVAS_H }; },
  };
}

const elements = new Map();
function getElement(id) {
  if (!elements.has(id)) elements.set(id, makeElement(id));
  return elements.get(id);
}
const canvas = getElement("game");
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

Object.defineProperty(globalThis, "performance", {
  value: { now: () => clock }, configurable: true, writable: true,
});
globalThis.requestAnimationFrame = (cb) => { rafCallback = cb; return 1; };
globalThis.document = { getElementById: getElement };
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
};
// Audio is intentionally unavailable in Node; the game must degrade gracefully.
globalThis.window = {
  addEventListener(type, fn) { windowHandlers[type] = fn; },
};
globalThis.Matter = require(path.resolve(__dirname, "..", "vendor", "matter.min.js"));
globalThis.__SLINGSTONE_TEST__ = true;

require(path.resolve(__dirname, "..", "game.js"));

const game = globalThis.__slingstone;
if (!game) throw new Error("Test hook was not installed");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function evt(x, y) { return { clientX: x, clientY: y, preventDefault() {} }; }

function fire(target, type, e) {
  const fn = target.handlers ? target.handlers[type] : windowHandlers[type];
  if (!fn) throw new Error(`Missing ${type} handler`);
  fn(e);
}

function step(seconds) {
  const frames = Math.ceil(seconds * 60);
  for (let i = 0; i < frames; i++) {
    clock += 1000 / 60;
    const cb = rafCallback;
    rafCallback = null;
    if (!cb) throw new Error("Game loop stopped scheduling frames");
    cb(clock);
  }
}

function shoot(dragX, dragY) {
  fire(canvas, "mousedown", evt(ANCHOR.x, ANCHOR.y));
  fire(canvas, "mousemove", evt(dragX, dragY));
  fire(window, "mouseup", evt(dragX, dragY));
}

function aim(drag, degrees) {
  const rad = (degrees * Math.PI) / 180;
  shoot(ANCHOR.x - drag * Math.cos(rad), ANCHOR.y + drag * Math.sin(rad));
}

function restart() {
  getElement("restartBtn").click();
  step(0.05);
}

function score() {
  const m = /Score:\s*(\d+)/.exec(getElement("scoreLabel").textContent);
  return m ? Number(m[1]) : 0;
}

function stonesLeft() { return game.state.ammo.length; }
function aliveWisps() { return game.state.wisps.filter(w => w.game.alive).length; }
function blockCount() { return game.state.blocks.length; }

let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
  passed++;
  console.log(`  ok - ${message}`);
}

// ---------------------------------------------------------------------------
console.log("Test: Matter.js engine is wired up");

step(0.2);
assert(game.engine.world.bodies.length > 5, "Matter world contains ground, walls, blocks and wisps");
assert(game.LEVELS.length === 3, "three levels are defined");
assert(blockCount() === game.LEVELS[0].blocks.length, "level 1 blocks were created");
assert(aliveWisps() === game.LEVELS[0].wisps.length, "level 1 wisps were created");
assert(Matter.version === "0.20.0", `vendored Matter.js build is present (v${Matter.version})`);
const fs = require("fs");
const licensePath = path.resolve(__dirname, "..", "vendor", "MATTER_LICENSE.txt");
assert(
  fs.existsSync(licensePath) && /MIT License/.test(fs.readFileSync(licensePath, "utf8")),
  "Matter.js MIT license text is vendored alongside the engine"
);

// ---------------------------------------------------------------------------
console.log("Test: multiple shots can be fired");

assert(stonesLeft() === 4, `level 1 starts with 4 stones (got ${stonesLeft()})`);
aim(55, 6); // deliberately short
assert(stonesLeft() === 3, "first shot consumes a stone");
step(5.2);
assert(stonesLeft() === 3, "counter stays put while the stone settles");
aim(55, 6);
assert(stonesLeft() === 2, "a SECOND shot can be fired after the first settles");
step(5.2);
aim(55, 6);
assert(stonesLeft() === 1, "a THIRD shot can also be fired");
step(5.2);

// ---------------------------------------------------------------------------
console.log("Test: structures are stable at rest (no self-scoring)");

restart();
const stableScore = score();
const stableWisps = aliveWisps();
const stableBlocks = blockCount();
step(9);
assert(score() === stableScore, "no points are awarded while idle");
assert(aliveWisps() === stableWisps, "wisps do not pop themselves");
assert(blockCount() === stableBlocks, "blocks do not break themselves");
assert(!game.state.levelComplete && !game.state.levelFailed, "an idle level is neither won nor lost");

// ---------------------------------------------------------------------------
console.log("Test: running out of stones ends the level");

restart();
for (let i = 0; i < 4; i++) { aim(40, 8); step(5.2); }
assert(stonesLeft() === 0, "all four stones can be used up");
step(2);
assert(game.state.levelFailed, "the level is marked failed");
assert(getElement("overlay").classes.has("hidden") === false, "the result overlay is shown");
assert(getElement("overlayTitle").textContent === "Out of stones", "failure overlay has the right title");

// ---------------------------------------------------------------------------
console.log("Test: the slingshot can reach and pop a wisp on every level");

function findWispHit() {
  for (const drag of [85, 95, 105, 115, 125]) {
    for (const degrees of [15, 20, 25, 30, 35, 40, 45, 50, 55, 60]) {
      restart();
      const before = aliveWisps();
      aim(drag, degrees);
      step(5.5);
      if (aliveWisps() < before) return { drag, degrees };
    }
  }
  return null;
}

for (let level = 1; level <= 3; level++) {
  const hit = findWispHit();
  assert(hit !== null, `level ${level} wisps are reachable with a normal drag`);
  if (hit) console.log(`  level ${level} hit with ${hit.drag}px at ${hit.degrees} deg`);
  if (level < 3) {
    // Jump straight to the next level via the win path for the reachability check.
    game.loadLevel(level);
    step(0.2);
  }
}

// ---------------------------------------------------------------------------
console.log("Test: destructible materials break under impact");

game.loadLevel(0);
step(0.2);
restart();
const blocksBefore = blockCount();
let brokeSomething = false;
for (const drag of [105, 115, 125]) {
  for (const degrees of [20, 25, 30, 35, 40]) {
    restart();
    aim(drag, degrees);
    step(4.5);
    if (blockCount() < blocksBefore) { brokeSomething = true; break; }
  }
  if (brokeSomething) break;
}
assert(brokeSomething, "a solid hit destroys at least one breakable block");

// ---------------------------------------------------------------------------
console.log("Test: shot abilities");

// --- Bolt: surge should increase speed ---
game.loadLevel(0); step(0.2);
game.state.ammo = ["bolt"];
aim(105, 30);
step(0.35);
const boltBefore = Math.hypot(...Object.values(Matter.Body.getVelocity(game.state.activeStone.body)));
game.activateAbility();
const boltAfter = Math.hypot(...Object.values(Matter.Body.getVelocity(game.state.activeStone.body)));
assert(boltAfter > boltBefore * 1.3, `bolt surge accelerates the shot (${boltBefore.toFixed(1)} -> ${boltAfter.toFixed(1)})`);
assert(game.state.abilityUsed, "the ability is consumed after use");

// --- Splitter: should spawn three fragments ---
game.loadLevel(0); step(0.2);
game.state.ammo = ["splitter"];
aim(105, 30);
step(0.35);
game.activateAbility();
assert(game.state.activeStone === null, "splitter removes the original shot");
assert(game.state.spentStones.length >= 3, "splitter creates three fragments");

// --- Bomber: blast should damage nearby blocks ---
game.loadLevel(0); step(0.2);
game.state.ammo = ["bomber"];
const hpBefore = game.state.blocks.reduce((sum, bd) => sum + bd.game.hp, 0);
aim(100, 25);
step(1.05);
game.activateAbility();
const hpAfter = game.state.blocks.reduce((sum, bd) => sum + bd.game.hp, 0);
assert(hpAfter < hpBefore || blockCount() < game.LEVELS[0].blocks.length, "bomber blast damages nearby structures");
assert(game.state.shockwaves.length > 0, "bomber produces a shockwave effect");

// ---------------------------------------------------------------------------
console.log("Test: winning awards stars and shows the overlay");

game.loadLevel(0); step(0.2);
assert(game.state.stars === 0, "no stars before the level is cleared");
for (const w of [...game.state.wisps]) game.popWisp(w, "test");
assert(game.state.levelComplete, "popping every wisp completes the level");
assert(game.state.stars >= 1 && game.state.stars <= 3, `star rating is in range (got ${game.state.stars})`);
step(1.2);
assert(getElement("overlay").classes.has("hidden") === false, "win overlay is displayed");
assert(getElement("overlayTitle").textContent.includes("clear"), "win overlay has the right title");
assert(getElement("overlayStars").innerHTML.includes("earned"), "win overlay shows earned stars");
assert(getElement("nextBtn").disabled === false, "Next Level is enabled after a win");
assert(Number(storage.get("slingstone.best.0")) >= 1, "best stars are persisted to localStorage");

// ---------------------------------------------------------------------------
console.log("Test: camera, level flyover, and peek control");

const CAM_MAX = 1520 - CANVAS_W;
game.loadLevel(0);
step(0.8);
assert(game.state.camera > 30, "the intro flyover pans out to reveal the targets");
step(3.5);
assert(game.state.camera < 5, "camera returns to the slingshot after the flyover");

const lookBtn = getElement("lookBtn");
lookBtn.handlers.pointerdown({ preventDefault() {} });
step(1.6);
assert(game.state.camera > CAM_MAX * 0.8, "holding Peek pans to the far end of the level");
lookBtn.handlers.pointerup();
step(2.5);
assert(game.state.camera < 5, "releasing Peek returns the camera home");

game.state.ammo = ["pebble"];
aim(125, 28);
step(0.6);
assert(game.state.camera > 25, `camera pans to follow the shot (x=${game.state.camera.toFixed(1)})`);
step(6);
assert(game.state.camera < 5, "camera eases back to the slingshot afterwards");

// ---------------------------------------------------------------------------
console.log("Test: sound toggle works without an AudioContext");

const muteBtn = getElement("muteBtn");
muteBtn.click();
assert(game.state.muted === true, "mute button toggles muted state");
assert(muteBtn.textContent === "Sound: off", "mute button label updates");
muteBtn.click();
assert(game.state.muted === false, "mute button toggles back");

console.log(`\nAll ${passed} Slingstone headless game assertions passed.`);
