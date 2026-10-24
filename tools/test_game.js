#!/usr/bin/env node
/*
 * Headless regression tests for Slingstone.
 *
 * Runs game.js against a stub DOM/canvas so the real game loop, physics and
 * input handlers execute without a browser. Guards the two bugs fixed in 1.0.1:
 *   1. the slingshot could not reach the targets;
 *   2. only the first shot worked because the spent stone was never retired.
 *
 * Usage: node tools/test_game.js
 */

"use strict";

const path = require("path");

const CANVAS_W = 960;
const CANVAS_H = 600;
const ANCHOR = { x: 150, y: 430 };

let clock = 0;
let rafCallback = null;
const windowHandlers = {};

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, {
  get(target, key) {
    if (key === "createLinearGradient" || key === "createRadialGradient") {
      return () => gradient;
    }
    if (key in target) return target[key];
    return () => {};
  },
  set(target, key, value) {
    target[key] = value;
    return true;
  },
});

function makeElement(id) {
  const handlers = {};
  return {
    id,
    textContent: "",
    disabled: false,
    handlers,
    classList: { add() {}, remove() {} },
    addEventListener(type, fn) { handlers[type] = fn; },
    click() { if (handlers.click) handlers.click({ preventDefault() {} }); },
    getContext() { return ctx; },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: CANVAS_W, height: CANVAS_H };
    },
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
  value: { now: () => clock },
  configurable: true,
  writable: true,
});
globalThis.requestAnimationFrame = (cb) => { rafCallback = cb; return 1; };
globalThis.document = { getElementById: getElement };
globalThis.window = {
  addEventListener(type, fn) { windowHandlers[type] = fn; },
  // No AudioContext in the test environment: audio simply stays disabled.
};

require(path.resolve(__dirname, "..", "game.js"));

function evt(x, y) {
  return { clientX: x, clientY: y, preventDefault() {} };
}

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

function restart() {
  getElement("restartBtn").click();
  clock += 1000 / 60;
  if (rafCallback) step(0.05);
}

function score() {
  const m = /Score:\s*(\d+)/.exec(getElement("scoreLabel").textContent);
  return m ? Number(m[1]) : 0;
}

function shots() {
  const m = /Shots:\s*(\d+)/.exec(getElement("shotsLabel").textContent);
  return m ? Number(m[1]) : -1;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ok - ${message}`);
}

// ---------------------------------------------------------------------------
console.log("Test: multiple shots can be fired");

step(0.2); // let the loop start
const initialShots = shots();
assert(initialShots === 5, `level 1 starts with 5 shots (got ${initialShots})`);

// A deliberately weak shot that lands short of the crates.
const weak = 60;
shoot(ANCHOR.x - weak * Math.cos(0.09), ANCHOR.y + weak * Math.sin(0.09));
assert(shots() === 4, `first shot consumes one stone (shots=${shots()})`);
step(5); // stone lands, rests, and is retired
assert(shots() === 4, "shot counter stays at 4 while the stone settles");

shoot(ANCHOR.x - weak * Math.cos(0.09), ANCHOR.y + weak * Math.sin(0.09));
assert(shots() === 3, `a SECOND shot can be fired after the first settles (shots=${shots()})`);
step(5);
shoot(ANCHOR.x - 100 * Math.cos(0.45), ANCHOR.y + 100 * Math.sin(0.45));
assert(shots() === 2, `a THIRD shot can also be fired (shots=${shots()})`);

// ---------------------------------------------------------------------------
console.log("Test: idle crate stacks stay stable");

restart();
const idleScore = score();
step(8); // do nothing: gravity must not slowly levitate crates into the orb
assert(score() === idleScore, "crates do not pop the orb by themselves over 8 seconds");
assert(
  getElement("message").textContent === "",
  "an untouched level neither wins nor fails while stones remain"
);

// ---------------------------------------------------------------------------
console.log("Test: running out of stones ends the level");

restart();
for (let i = 0; i < 5; i++) {
  shoot(ANCHOR.x - 30, ANCHOR.y + 30);
  step(5);
}
assert(shots() === 0, "all five stones can be used up");
assert(
  getElement("message").textContent.includes("Out of stones"),
  "running out of stones shows the failure message"
);

// ---------------------------------------------------------------------------
console.log("Test: slingshot has enough power to reach every level");

function findScoringAim() {
  for (const drag of [80, 90, 100, 110, 120]) {
    for (const degrees of [15, 20, 25, 30, 35, 40, 45, 50, 55, 60]) {
      const rad = (degrees * Math.PI) / 180;
      restart();
      const before = score();
      shoot(ANCHOR.x - drag * Math.cos(rad), ANCHOR.y + drag * Math.sin(rad));
      step(5);
      if (score() > before) return { drag, degrees };
    }
  }
  return null;
}

for (let level = 1; level <= 3; level++) {
  const aim = findScoringAim();
  assert(aim !== null, `level ${level} targets are reachable with a normal drag`);
  if (aim) console.log(`  level ${level} scoring aim: ${aim.drag}px at ${aim.degrees} deg`);
  if (level < 3) {
    assert(!getElement("nextBtn").disabled, `completing level ${level} enables Next Level`);
    getElement("nextBtn").click();
    step(0.05);
  }
}

console.log("\nAll Slingstone headless game tests passed.");
