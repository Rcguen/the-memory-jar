"use client";

import { useEffect, useRef, useState } from 'react';

const DURATION = 20;
const COLS = 88;
const ROWS = 74;
const TAU = Math.PI * 2;
const GRID_ASPECT = 9 / 14;
const RAMP = ' .,:;-~=+*^oxv%&#W@';

const GROUND = -1.12;
const Y0 = -0.76;
const Y1 = 1.24;
const ROT_SPEED = 0.31;
const T_GROW: [number, number] = [0.7, 5.6];
const T_GARLAND: [number, number] = [6.4, 8.6];
const T_BALLS: [number, number] = [7.4, 9.5];
const T_LIGHTS: [number, number] = [8.3, 11.3];
const T_GIFTS: [number, number] = [10, 11.5];
const T_STAR = 11.8;
const T_MSG = 13;

const NEEDLE = 0;
const SNOW = 1;
const CONE = 2;
const TRUNK = 3;
const TINSEL = 4;
const BALL = 5;
const LIGHT = 6;
const GIFT = 7;
const RIBBON = 8;

type Rgb = [number, number, number];
type Vec3 = [number, number, number];

type ScenePoint = {
  x: number; y: number; z: number;
  nx: number; ny: number; nz: number;
  color: Rgb;
  kind: number;
  t0: number;
  base: number;
  cx: number; cy: number; cz: number;
  phase: number;
  pop: boolean;
};

type Background = {
  horizon: number;
  stars: { r: number; c: number; ch: string; phase: number; speed: number }[];
  snow: { x: number; y: number; vy: number; vx: number; phase: number; ch: string }[];
  ground: Vec3[];
};

type Grid = {
  chars: Uint16Array;
  colors: (Rgb | null)[];
  depths: Float32Array;
};

const WHITE: Rgb = [1, 1, 1];
const SNOW_COL: Rgb = [0.88, 0.94, 1];
const GOLD: Rgb = [1, 0.84, 0.28];
const BAUBLE_GOLD: Rgb = [1, 0.78, 0.24];
const RED: Rgb = [0.96, 0.2, 0.24];
const WARM: Rgb = [1, 0.88, 0.5];
const GREEN_BOX: Rgb = [0.18, 0.78, 0.34];
const BLUE_BOX: Rgb = [0.22, 0.48, 0.98];
const SILVER: Rgb = [0.86, 0.9, 0.98];

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function normal(random: () => number) {
  const u = Math.max(random(), 1e-7);
  const v = Math.max(random(), 1e-7);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

function unit(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function envelope(y: number) {
  const u = Math.max(0, Math.min(1, (y - Y0) / (Y1 - Y0)));
  const tiers = 1 + 0.07 * Math.sin(u * TAU * 5) * (1 - u);
  return 0.96 * (1 - u) ** 0.9 * tiers;
}

function growTime(y: number) {
  const u = Math.max(0, Math.min(1, (y - GROUND) / (Y1 - GROUND)));
  return T_GROW[0] + (T_GROW[1] - T_GROW[0]) * u;
}

function scaleRgb(a: Rgb, amount: number): Rgb {
  return [a[0] * amount, a[1] * amount, a[2] * amount];
}

function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    a[0] * (1 - amount) + b[0] * amount,
    a[1] * (1 - amount) + b[1] * amount,
    a[2] * (1 - amount) + b[2] * amount,
  ];
}

function fibSphere(count: number): Vec3[] {
  const result: Vec3[] = [];
  for (let index = 0; index < count; index += 1) {
    const i = index + 0.5;
    const z = 1 - (2 * i) / count;
    const radius = Math.sqrt(Math.max(1 - z * z, 0));
    const phi = i * 2.39996323;
    result.push([Math.cos(phi) * radius, z, Math.sin(phi) * radius]);
  }
  return result;
}

function createScene(): ScenePoint[] {
  const random = seededRandom(7);
  const scene: ScenePoint[] = [];
  const tips: Vec3[] = [];
  const add = (
    position: Vec3,
    normalVector: Vec3,
    color: Rgb,
    kind: number,
    t0: number,
    base = 1,
    centre: Vec3 = position,
    phase = 0,
    pop = false,
  ) => {
    const [nx, ny, nz] = unit(normalVector);
    scene.push({
      x: position[0], y: position[1], z: position[2], nx, ny, nz,
      color, kind, t0, base,
      cx: centre[0], cy: centre[1], cz: centre[2], phase, pop,
    });
  };

  // 25 drooping whorls, matching the source build() choreography.
  for (let layer = 0; layer < 25; layer += 1) {
    const y = Y0 + 0.02 + ((Y1 - 0.08) - (Y0 + 0.02)) * (layer / 24);
    const u = (y - Y0) / (Y1 - Y0);
    const radius = envelope(y) + 0.05;
    const branchCount = Math.floor(7 + 12 * (1 - u));
    for (let branch = 0; branch < branchCount; branch += 1) {
      const angle = TAU * (branch + 0.5 * random()) / branchCount + layer * 0.77;
      const length = radius * (0.85 + 0.23 * random());
      const count = Math.floor(26 + 240 * length);
      const direction: Vec3 = [Math.cos(angle), 0, Math.sin(angle)];
      const side: Vec3 = [-Math.sin(angle), 0, Math.cos(angle)];
      for (let point = 0; point < count; point += 1) {
        const s = random() ** 0.65;
        const spread = (0.025 + 0.09 * s) * normal(random);
        const distance = s * length;
        const position: Vec3 = [
          direction[0] * distance + side[0] * spread,
          y + 0.06 * distance - 0.2 * distance ** 2 + 0.012 * normal(random),
          direction[2] * distance + side[2] * spread,
        ];
        const normalVector = unit([
          direction[0] * 0.75 + 0.3 * normal(random),
          0.55 + 0.3 * normal(random),
          direction[2] * 0.75 + 0.3 * normal(random),
        ]);
        const snow = s > 0.5 && random() < 0.07 * s && normalVector[1] > 0.5;
        const green: Rgb = [0.1 + 0.12 * random(), 0.48 + 0.38 * random(), 0.18 + 0.14 * random()];
        add(position, normalVector, snow ? SNOW_COL : green, snow ? SNOW : NEEDLE, growTime(y) + 0.45 * s, snow ? 1 : (0.3 + 0.7 * s ** 1.3) * (0.75 + 0.35 * random()));
      }
      const tipDistance = 0.93 * length;
      tips.push([direction[0] * tipDistance, y + 0.06 * tipDistance - 0.2 * tipDistance ** 2, direction[2] * tipDistance]);
    }
  }

  for (let index = 0; index < 4200; index += 1) {
    const y = Y0 + (Y1 - 0.1 - Y0) * random();
    const angle = random() * TAU;
    const radius = 0.6 * envelope(y);
    add([Math.cos(angle) * radius, y, Math.sin(angle) * radius], [Math.cos(angle), 0.3, Math.sin(angle)], [0.06, 0.28, 0.1], CONE, growTime(y), 0.55);
  }
  for (let index = 0; index < 1000; index += 1) {
    const y = GROUND + random() * (Y0 + 0.1 - GROUND);
    const angle = random() * TAU;
    const bark = 0.75 + 0.25 * Math.sign(Math.sin(angle * 30 + y * 5));
    add([Math.cos(angle) * 0.08, y, Math.sin(angle) * 0.08], [Math.cos(angle), 0, Math.sin(angle)], scaleRgb([0.42, 0.24, 0.12], bark), TRUNK, growTime(y));
  }
  for (let strand = 0; strand < 3; strand += 1) {
    for (let index = 0; index < 600; index += 1) {
      const u = index / 599;
      const y = Y0 + 0.15 + (Y1 - Y0 - 0.45) * u;
      const angle = TAU * 3.6 * u + 0.9;
      const radius = envelope(y) + 0.07;
      const position: Vec3 = [Math.cos(angle) * radius + 0.016 * normal(random), y - 0.07 * Math.abs(Math.sin(angle * 2.5)) + 0.016 * normal(random), Math.sin(angle) * radius + 0.016 * normal(random)];
      add(position, [Math.cos(angle) + 0.6 * normal(random), 0.3 + 0.6 * normal(random), Math.sin(angle) + 0.6 * normal(random)], GOLD, TINSEL, T_GARLAND[0] + u * (T_GARLAND[1] - T_GARLAND[0]), 1, position, random() * TAU);
    }
  }

  const sphere = fibSphere(160);
  for (let index = 0; index < 34; index += 1) {
    const u = (index + random()) / 34;
    const y = Y0 + 0.08 + u * (Y1 - Y0 - 0.38);
    const angle = index * 2.39996 + random() * 0.4;
    const centre: Vec3 = [Math.cos(angle) * (envelope(y) + 0.02), y - 0.03, Math.sin(angle) * (envelope(y) + 0.02)];
    const radius = 0.058 + 0.032 * (1 - u);
    const color = index % 2 === 0 ? RED : (index % 4 === 1 ? BAUBLE_GOLD : SILVER);
    for (const [sx, sy, sz] of sphere) add([centre[0] + sx * radius, centre[1] + sy * radius, centre[2] + sz * radius], [sx, sy, sz], color, BALL, T_BALLS[0] + random() * (T_BALLS[1] - T_BALLS[0]), 1, centre, 0, true);
  }

  const bulb = fibSphere(16);
  for (let index = 0; index < 170; index += 1) {
    const tip = tips[Math.floor(random() * tips.length)];
    const color = random() < 0.8 ? WARM : [1, 0.95, 0.85] as Rgb;
    for (const [sx, sy, sz] of bulb) add([tip[0] + sx * 0.03, tip[1] + sy * 0.03, tip[2] + sz * 0.03], [sx, sy, sz], color, LIGHT, T_LIGHTS[0] + random() * (T_LIGHTS[1] - T_LIGHTS[0]), 1, tip, random() * TAU, true);
  }

  const gifts: [number, number, number, number, number, number, Rgb, Rgb][] = [
    [0.3, 0.96, 0.25, 0.2, 0.24, 0.4, RED, GOLD],
    [1.4, 1.02, 0.23, 0.23, 0.22, 0.9, BLUE_BOX, SILVER],
    [2.5, 0.95, 0.28, 0.16, 0.22, 1, GOLD, RED],
    [3.6, 1, 0.22, 0.22, 0.22, 0.3, RED, WHITE],
    [4.6, 0.95, 0.25, 0.19, 0.25, 0.1, GREEN_BOX, RED],
    [5.5, 1.02, 0.22, 0.2, 0.21, 0.7, BLUE_BOX, GOLD],
  ];
  const loop = fibSphere(64);
  for (let giftIndex = 0; giftIndex < gifts.length; giftIndex += 1) {
    const [angle, distance, w, h, d, rotation, body, ribbonColor] = gifts[giftIndex];
    const areas = [w * d, h * d, h * d, h * w, h * w];
    const areaTotal = areas.reduce((sum, value) => sum + value, 0);
    const count = Math.floor(2600 * areaTotal);
    const centre: Vec3 = [Math.cos(angle) * distance, GROUND, Math.sin(angle) * distance];
    const cos = Math.cos(rotation); const sin = Math.sin(rotation);
    for (let index = 0; index < count; index += 1) {
      let target = random() * areaTotal; let face = 0;
      while (target > areas[face] && face < areas.length - 1) { target -= areas[face]; face += 1; }
      const fa = random() - 0.5; const fb = random() - 0.5;
      const lx = face === 1 ? w / 2 : face === 2 ? -w / 2 : fa * w;
      const ly = face === 0 ? h : (fb + 0.5) * h;
      const lz = face === 0 ? fb * d : face <= 2 ? fa * d : face === 3 ? d / 2 : -d / 2;
      const normalVector: Vec3 = face === 0 ? [0, 1, 0] : face === 1 ? [1, 0, 0] : face === 2 ? [-1, 0, 0] : face === 3 ? [0, 0, 1] : [0, 0, -1];
      const onX = Math.abs(lx) < 0.024; const onZ = Math.abs(lz) < 0.024;
      const isRibbon = face === 0 ? onX || onZ : face <= 2 ? onZ : onX;
      const position: Vec3 = [lx * cos - lz * sin + centre[0], ly + centre[1], lx * sin + lz * cos + centre[2]];
      add(position, [normalVector[0] * cos - normalVector[2] * sin, normalVector[1], normalVector[0] * sin + normalVector[2] * cos], isRibbon ? ribbonColor : body, isRibbon ? RIBBON : GIFT, T_GIFTS[0] + (giftIndex / gifts.length) * (T_GIFTS[1] - T_GIFTS[0]), 1, [centre[0], centre[1] + h * 0.5, centre[2]], 0, true);
    }
    for (const bowAngle of [0, Math.PI * 0.5]) {
      const bowOffset: Vec3 = [Math.cos(bowAngle + rotation) * 0.035, h + 0.03, Math.sin(bowAngle + rotation) * 0.035];
      for (const [bx, by, bz] of loop) {
        const px = bx * 0.045; const py = by * 0.026; const pz = bz * 0.024;
        add([px * Math.cos(bowAngle + rotation) - pz * Math.sin(bowAngle + rotation) + centre[0] + bowOffset[0], py + centre[1] + bowOffset[1], px * Math.sin(bowAngle + rotation) + pz * Math.cos(bowAngle + rotation) + centre[2] + bowOffset[2]], [bx, by, bz], ribbonColor, RIBBON, T_GIFTS[0] + (giftIndex / gifts.length) * (T_GIFTS[1] - T_GIFTS[0]) + 0.05, 1, [centre[0] + bowOffset[0], centre[1] + bowOffset[1], centre[2] + bowOffset[2]], 0, true);
      }
    }
  }
  return scene;
}

function createBackground(): Background {
  const random = seededRandom(42);
  const horizon = Math.floor(ROWS * 0.53);
  const starChars = ['+', '*', '.'];
  const stars = Array.from({ length: Math.floor(COLS * ROWS * 0.038) }, () => ({
    r: Math.floor(random() * (horizon + 4)), c: Math.floor(random() * COLS), ch: starChars[random() < 0.45 ? 0 : random() < 0.55 ? 1 : 2], phase: random() * TAU, speed: 1.2 + random() * 2,
  }));
  const snowChars = ['+', '*', '.'];
  const snow = Array.from({ length: 115 }, () => ({
    x: random() * COLS, y: random() * ROWS, vy: 2.2 + random() * 3.2, vx: -0.8 + random() * 1.6, phase: random() * TAU, ch: snowChars[random() < 0.35 ? 0 : random() < 0.69 ? 1 : 2],
  }));
  const ground: Vec3[] = [];
  for (let zIndex = 0; zIndex < 110; zIndex += 1) {
    const z = -2.6 + (8 * zIndex) / 109;
    for (let xIndex = 0; xIndex < 130; xIndex += 1) ground.push([-4.2 + (8.4 * xIndex) / 129 + (-0.025 + random() * 0.05), GROUND, z + (-0.025 + random() * 0.05)]);
  }
  return { horizon, stars, snow, ground };
}

function project(point: Vec3, rotation: number): [number, number, number] {
  const cos = Math.cos(rotation); const sin = Math.sin(rotation);
  const x = point[0] * cos - point[2] * sin;
  const y = point[1] - 0.12;
  const z = point[0] * sin + point[2] * cos;
  const pitch = 0.15; const cp = Math.cos(pitch); const sp = Math.sin(pitch);
  const yp = y * cp - z * sp;
  const zp = y * sp + z * cp + 4.85;
  const scale = 2.65 / Math.max(zp, 0.25);
  return [COLS * 0.5 + x * scale * (ROWS * 0.4) / GRID_ASPECT, ROWS * 0.44 - yp * scale * (ROWS * 0.4), zp];
}

function createGrid(): Grid {
  return { chars: new Uint16Array(COLS * ROWS), colors: new Array(COLS * ROWS).fill(null), depths: new Float32Array(COLS * ROWS).fill(Infinity) };
}

function put(grid: Grid, row: number, column: number, character: string, color: Rgb, depth?: number) {
  if (row < 0 || row >= ROWS || column < 0 || column >= COLS) return;
  const index = row * COLS + column;
  if (depth !== undefined && depth >= grid.depths[index]) return;
  if (depth !== undefined) grid.depths[index] = depth;
  grid.chars[index] = character.charCodeAt(0);
  grid.colors[index] = color;
}

function paintBackground(grid: Grid, background: Background, time: number, rotation: number) {
  for (const point of background.ground) {
    const [x, y, z] = project(point, rotation * 0.35);
    const column = Math.round(x); const row = Math.round(y);
    if (row < background.horizon || row >= ROWS || column < 0 || column >= COLS || z <= 0.6) continue;
    const fade = Math.max(0.16, Math.min(0.62, 1.3 - z / 8.5));
    put(grid, row, column, fade > 0.4 ? '-' : '.', [0.55 * fade, 0.62 * fade, 0.78 * fade]);
  }
  for (const star of background.stars) {
    if (star.r < 4 && star.c >= COLS - 16) continue;
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
    put(grid, star.r, star.c, star.ch, [0.78 * twinkle, 0.85 * twinkle, 0.98 * twinkle]);
  }
  for (const flake of background.snow) {
    const column = Math.round((flake.x + flake.vx * time + 0.8 * Math.sin(time * 1.1 + flake.phase)) % COLS + COLS) % COLS;
    const row = Math.round((flake.y + flake.vy * time) % ROWS + ROWS) % ROWS;
    if (row < 4 && column >= COLS - 16) continue;
    const fade = 0.6 + 0.4 * Math.sin(time * 2.5 + flake.phase);
    put(grid, row, column, flake.ch, [0.86 * fade, 0.92 * fade, 1 * fade]);
  }
}

function pointInPolygon(x: number, y: number, polygon: [number, number][]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [xi, yi] = polygon[index]; const [xj, yj] = polygon[previous];
    const intersect = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function paintStar(grid: Grid, cx: number, cy: number, size: number, time: number, power: number, flash: number) {
  const tint = mixRgb(GOLD, WHITE, flash);
  const boostedPower = power * (1 + 1.6 * flash);
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = ray * TAU / 8 + 0.1 * Math.sin(time * 0.7);
    if (Math.sin(angle) < -0.2) continue;
    const horizontal = Math.abs(Math.sin(angle)) < 0.25 ? 0.55 : 1;
    const reach = size * (2.6 + 0.6 * Math.sin(time * 3 + ray * 1.3)) * (ray % 2 === 0 ? 1 : 0.75) * horizontal * (1 + 1.6 * flash);
    const rayChars = ['-', '|', '/', '\\'];
    const character = rayChars[Math.round((angle * 180 / Math.PI % 180) / 45 + 4) % 4];
    for (let distance = size * 1.15; distance < reach; distance += 0.5) {
      const row = Math.round(cy - Math.sin(angle) * distance);
      const column = Math.round(cx + Math.cos(angle) * distance / GRID_ASPECT);
      const fade = Math.max(0, 1 - distance / reach) * horizontal;
      const existing = row >= 0 && row < ROWS && column >= 0 && column < COLS ? grid.colors[row * COLS + column] : null;
      if (!existing || existing[0] < 0.75) put(grid, row, column, character, scaleRgb(tint, boostedPower * 0.65 * fade));
    }
  }
  const polygon: [number, number][] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * TAU / 10;
    const radius = index % 2 === 0 ? size : size * 0.42;
    polygon.push([cx + Math.cos(angle) * radius / GRID_ASPECT, cy + Math.sin(angle) * radius]);
  }
  for (let row = Math.floor(cy - size - 1); row <= Math.ceil(cy + size + 1); row += 1) {
    for (let column = Math.floor(cx - size / GRID_ASPECT - 1); column <= Math.ceil(cx + size / GRID_ASPECT + 1); column += 1) {
      if (!pointInPolygon(column, row, polygon)) continue;
      const distance = Math.hypot((column - cx) * GRID_ASPECT, row - cy) / Math.max(size, 0.5);
      put(grid, row, column, distance < 0.52 ? '@' : '#', scaleRgb(tint, Math.min(1.35, boostedPower)));
    }
  }
  for (const [x, y] of polygon.filter((_, index) => index % 2 === 0)) put(grid, Math.round(y), Math.round(x), '*', scaleRgb(tint, Math.min(1.35, boostedPower)));
}

function renderFrame(scene: ScenePoint[], background: Background, time: number, year: number): { grid: Grid; rotation: number; lights: number; letters: number } {
  const grid = createGrid();
  const rotation = time * ROT_SPEED;
  paintBackground(grid, background, time, rotation);
  const cos = Math.cos(rotation); const sin = Math.sin(rotation);
  const lightDirection: Vec3 = [0.42, 0.56, -0.71];
  let activeLights = 0;
  for (const point of scene) {
    if (time < point.t0) continue;
    if (point.kind === LIGHT) activeLights += 1;
    const age = time - point.t0;
    const popScale = point.pop ? smooth(age / 0.35) : 1;
    const px = point.cx + (point.x - point.cx) * popScale;
    const py = point.cy + (point.y - point.cy) * popScale;
    const pz = point.cz + (point.z - point.cz) * popScale;
    const [sx, sy, depth] = project([px, py, pz], rotation);
    const column = Math.round(sx); const row = Math.round(sy);
    if (column < 0 || column >= COLS || row < 0 || row >= ROWS || depth <= 0.5) continue;
    const nx = point.nx * cos - point.nz * sin;
    const ny = point.ny;
    const nz = point.nx * sin + point.nz * cos;
    const ndotl = Math.max(0, nx * lightDirection[0] + ny * lightDirection[1] + nz * lightDirection[2]);
    let luminance = point.base * (0.28 + 0.72 * ndotl);
    if (point.kind === CONE) luminance = point.base * (0.18 + 0.25 * ndotl);
    if (point.kind === SNOW) luminance = 0.72 + 0.28 * ndotl;
    if (point.kind === TINSEL) luminance = 0.65 + 0.35 * Math.sin(time * 4.5 + point.phase) * 0.5 + 0.35 * ndotl;
    if (point.kind === BALL) luminance = 0.38 + 0.62 * ndotl ** 1.3;
    if (point.kind === GIFT) luminance = 0.42 + 0.58 * ndotl;
    if (point.kind === RIBBON) luminance = 0.62 + 0.38 * ndotl;
    if (point.kind === LIGHT) luminance = 0.55 + 0.65 * (0.55 + 0.45 * Math.sin(time * 6 + point.phase));
    const growKind = point.kind === NEEDLE || point.kind === SNOW || point.kind === TRUNK;
    const flash = growKind ? Math.max(0, 1 - age / 0.38) : 0;
    const color = mixRgb(point.color, WHITE, 0.85 * flash);
    luminance = Math.max(luminance, 1.05 * flash);
    const index = row * COLS + column;
    if (depth >= grid.depths[index]) continue;
    grid.depths[index] = depth;
    const rampIndex = Math.max(1, Math.min(RAMP.length - 1, Math.floor(Math.max(0, Math.min(1, luminance)) * (RAMP.length - 1))));
    let character = RAMP[rampIndex];
    if (point.kind === LIGHT) character = '@';
    if (point.kind === GIFT) character = luminance > 0.65 ? '#' : '%';
    if (point.kind === RIBBON) character = '@';
    grid.chars[index] = character.charCodeAt(0);
    grid.colors[index] = scaleRgb(color, Math.max(0.12, Math.min(1.2, luminance)));
  }

  if (time >= T_GROW[1] - 0.5) {
    const [starX, starY] = project([0, Y1 + 0.13, 0], rotation);
    const on = time >= T_STAR ? smooth((time - T_STAR) / 0.3) : 0;
    const burst = time >= T_STAR ? Math.max(0, 1 - (time - T_STAR) / 1) ** 2 : 0;
    paintStar(grid, Math.round(starX), Math.round(starY), (1.6 + 1.5 * on) * (1 + 0.05 * Math.sin(time * 3)), time, 0.25 + 0.85 * on, burst);
  }
  if (time > T_MSG) {
    const message = `M E R R Y   C H R I S T M A S   ${String(year).split('').join(' ')}`;
    const row = ROWS - 9;
    const start = Math.max(0, Math.floor((COLS - message.length) / 2));
    const shown = Math.min(message.length, Math.floor((time - T_MSG) * 10));
    for (let clearRow = row - 1; clearRow <= row + 1; clearRow += 1) for (let column = Math.max(start - 3, 0); column < Math.min(COLS, start + shown + 3); column += 1) { grid.chars[clearRow * COLS + column] = 0; grid.colors[clearRow * COLS + column] = null; }
    const messageColors = [RED, GOLD, GREEN_BOX];
    for (let index = 0; index < shown; index += 1) if (message[index] !== ' ') put(grid, row, start + index, message[index], scaleRgb(messageColors[(Math.floor(index / 2) + Math.floor(time * 1.5)) % 3], 0.85 + 0.25 * Math.sin(time * 5 + index)));
  }
  let letters = 0;
  for (const character of grid.chars) if (character > 0) letters += 1;
  return { grid, rotation, lights: Math.floor(activeLights / 16), letters };
}

function colorCss(color: Rgb) {
  return `rgb(${Math.max(0, Math.min(255, Math.round(color[0] * 255)))} ${Math.max(0, Math.min(255, Math.round(color[1] * 255)))} ${Math.max(0, Math.min(255, Math.round(color[2] * 255)))})`;
}

function noteFrequency(note: string) {
  const match = note.match(/^([A-G])(#?)(\d)$/);
  if (!match) return 440;
  const semitone: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (Number(match[3]) + 1) * 12 + semitone[match[1]] + (match[2] ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

type MusicSession = { context: AudioContext; output: GainNode; timer: number; loopStart: number };

function playTone(context: AudioContext, output: AudioNode, frequency: number, start: number, duration: number, gain: number, type: OscillatorType, detune = 0) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency; oscillator.detune.value = detune;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + Math.min(0.025, duration * 0.15));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(start); oscillator.stop(start + duration + 0.05);
}

function playBell(context: AudioContext, output: AudioNode, frequency: number, start: number, duration: number, gain: number, pan = 0) {
  const panner = context.createStereoPanner(); panner.pan.value = pan; panner.connect(output);
  playTone(context, panner, frequency, start, duration, gain * 0.65, 'sine');
  playTone(context, panner, frequency * 2, start, duration * 0.8, gain * 0.24, 'sine');
  playTone(context, panner, frequency * 3, start, duration * 0.6, gain * 0.11, 'sine');
}

function playPad(context: AudioContext, output: AudioNode, notes: string[], start: number, duration: number) {
  for (const [index, note] of notes.entries()) {
    const frequency = noteFrequency(note);
    playTone(context, output, frequency, start, duration, 0.014, 'sawtooth', index % 2 === 0 ? -9 : 9);
    playTone(context, output, frequency * 2, start, duration * 0.9, 0.004, 'sine', index % 2 === 0 ? 5 : -5);
  }
}

function playKick(context: AudioContext, output: AudioNode, start: number) {
  const oscillator = context.createOscillator(); const envelope = context.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(120, start); oscillator.frequency.exponentialRampToValueAtTime(44, start + 0.18);
  envelope.gain.setValueAtTime(0.0001, start); envelope.gain.exponentialRampToValueAtTime(0.055, start + 0.004); envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
  oscillator.connect(envelope).connect(output); oscillator.start(start); oscillator.stop(start + 0.3);
}

function playNoise(context: AudioContext, output: AudioNode, start: number, duration: number, gain: number, highpass = 2500) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource(); const filter = context.createBiquadFilter(); const envelope = context.createGain();
  filter.type = 'highpass'; filter.frequency.value = highpass;
  envelope.gain.setValueAtTime(gain, start); envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer; source.connect(filter).connect(envelope).connect(output); source.start(start); source.stop(start + duration);
}

function scheduleChristmasTrack(context: AudioContext, output: AudioNode, start: number) {
  const beat = 60 / 108;
  const bar = beat * 4;
  const chords: [number, number, string[]][] = [
    [0, bar + 0.15, ['D3', 'F#3', 'A3', 'C#4']],
    [bar, bar * 2 + 0.15, ['D3', 'F#3', 'A3', 'C#4']],
    [bar * 3, bar * 2 + 0.15, ['B2', 'D3', 'F#3', 'A3']],
    [bar * 5, bar * 2 + 0.15, ['E3', 'G3', 'B3', 'D4']],
    [bar * 7, bar * 1.5 + 0.1, ['A2', 'D3', 'E3', 'G3']],
    [bar * 8.5, bar * 0.25 + 0.1, ['A2', 'C#3', 'E3', 'G3']],
    [bar * 8.75, 20 - bar * 8.75, ['D3', 'F#3', 'A3', 'E4']],
  ];
  for (const [offset, duration, notes] of chords) playPad(context, output, notes, start + offset, duration);

  const bassRoots: [number, number, string, string][] = [[0, 12, 'D2', 'C#2'], [12, 20, 'B1', 'F#2'], [20, 28, 'E2', 'G2'], [28, 34, 'A1', 'A1']];
  for (const [from, to, root, pickup] of bassRoots) {
    const eighths = (to - from) * 2;
    for (let index = 0; index < eighths; index += 1) playTone(context, output, noteFrequency(index === eighths - 1 && to < 34 ? pickup : root), start + (from + index * 0.5) * beat, 0.21, 0.032, 'triangle');
  }
  for (let index = 0; index < 36; index += 1) {
    const at = start + index * beat;
    if (index % 2 === 0) playKick(context, output, at); else playNoise(context, output, at, 0.12, 0.012, 900);
    playNoise(context, output, at, 0.08, 0.006, 4500);
    playNoise(context, output, at + beat * 0.5, 0.07, 0.004, 5200);
  }

  ['D5', 'F#5', 'A5', 'C#6', 'A5', 'F#5'].forEach((note, index) => playBell(context, output, noteFrequency(note), start + 0.15 + index * 0.5 * beat, 0.85, 0.028, -0.35 + 0.14 * index));
  const melody: [number, string, number][] = [
    [4, 'E5', 1.35], [5.5, 'E5', 0.45], [6, 'D5', 0.85], [7, 'A4', 0.8], [8, 'E5', 0.45], [8.5, 'E5', 0.45], [9, 'F#5', 0.8], [10, 'D5', 1.8],
    [12, 'B4', 0.45], [12.5, 'B4', 0.45], [13, 'E5', 0.45], [13.5, 'E5', 0.45], [14, 'F#5', 0.48], [14.5, 'D5', 1.3], [16, 'B4', 0.45], [16.5, 'C#5', 0.45], [17, 'D5', 0.45], [17.5, 'C#5', 0.45], [18, 'B4', 1.8],
    [20, 'F#5', 0.9], [21, 'E5', 1.25], [22.5, 'B4', 0.45], [23, 'F#5', 0.48], [23.5, 'G5', 0.48], [24, 'F#5', 0.48], [24.5, 'E5', 2.5],
    [28, 'D5', 0.45], [28.5, 'C#5', 0.45], [29, 'D5', 0.45], [29.5, 'C#5', 0.45], [30, 'C#5', 0.48], [30.5, 'D5', 0.48], [31, 'C#5', 0.85], [32, 'A4', 2], [34.5, 'D5', 1.45],
  ];
  melody.forEach(([position, note, length], index) => {
    const at = start + position * beat;
    playTone(context, output, noteFrequency(note), at, Math.max(0.15, length * beat), 0.045, 'sine', index % 2 === 0 ? -8 : 8);
    playBell(context, output, noteFrequency(note), at, Math.max(0.5, length * beat), 0.018, index % 2 === 0 ? -0.14 : 0.14);
  });
  ['D5', 'F#5', 'A5', 'C#6', 'D6', 'E6', 'F#6', 'A6'].forEach((note, index) => playBell(context, output, noteFrequency(note), start + 11.8 + index * 0.052, 1.5, 0.027, -0.6 + 1.2 * index / 7));
}

function useChristmasMusic(enabled: boolean, paused: boolean) {
  useEffect(() => {
    if (!enabled || paused) return undefined;
    const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return undefined;
    const context = new AudioContextConstructor();
    const output = context.createGain(); const compressor = context.createDynamicsCompressor();
    output.gain.value = 0.6; compressor.threshold.value = -24; compressor.knee.value = 18; compressor.ratio.value = 4; compressor.attack.value = 0.01; compressor.release.value = 0.2;
    output.connect(compressor).connect(context.destination);
    const loopStart = context.currentTime + 0.08;
    scheduleChristmasTrack(context, output, loopStart);
    let nextLoop = loopStart + 20;
    const timer = window.setInterval(() => {
      if (nextLoop < context.currentTime + 1.5) {
        scheduleChristmasTrack(context, output, nextLoop);
        nextLoop += 20;
      }
    }, 500);
    void context.resume();
    const session: MusicSession = { context, output, timer, loopStart };
    return () => { window.clearInterval(session.timer); output.gain.cancelScheduledValues(context.currentTime); output.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08); window.setTimeout(() => void context.close(), 120); };
  }, [enabled, paused]);
}

function ChristmasCanvas({ paused, restartToken, season }: { paused: boolean; restartToken: number; season: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;
    const scene = createScene();
    const background = createBackground();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let last = performance.now();
    let time = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now: number) => {
      if (document.hidden) { animationFrame = 0; return; }
      const delta = Math.min((now - last) / 1000, 0.05); last = now;
      if (!pausedRef.current && !reducedMotion.matches) time = (time + delta) % DURATION;
      if (reducedMotion.matches) time = 13.6;
      const { grid, rotation, lights, letters } = renderFrame(scene, background, time, season);
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#05080f'; context.fillRect(0, 0, width, height);

      const cellScale = Math.min(width / (COLS * 9), height / (ROWS * 14));
      const cellWidth = cellScale * 9; const cellHeight = cellScale * 14;
      const offsetX = (width - COLS * cellWidth) / 2; const offsetY = (height - ROWS * cellHeight) / 2;
      context.font = `${Math.max(8, cellScale * 15)}px Consolas, 'Courier New', monospace`;
      context.textAlign = 'center'; context.textBaseline = 'middle';
      for (let row = 0; row < ROWS; row += 1) {
        for (let column = 0; column < COLS; column += 1) {
          const index = row * COLS + column; const character = grid.chars[index];
          if (!character) continue;
          const color = grid.colors[index] ?? [0.5, 0.55, 0.65];
          context.fillStyle = colorCss(color);
          context.fillText(String.fromCharCode(character), offsetX + (column + 0.5) * cellWidth, offsetY + (row + 0.52) * cellHeight);
        }
      }

      const pad = 18;
      context.textAlign = 'left'; context.textBaseline = 'alphabetic';
      context.font = `${Math.max(10, Math.min(16, width * 0.006))}px Consolas, 'Courier New', monospace`;
      context.fillStyle = '#b0a8c4'; context.fillText('@cfs.ascii', pad, height - 45);
      context.fillStyle = '#60687a'; context.fillText(`rotation ${(rotation * 180 / Math.PI % 360).toFixed(2).padStart(6, '0')}°     lights ${lights.toString().padStart(3, ' ')}`, pad, height - 28);
      context.fillText(`letters ${letters.toLocaleString()}`, pad, height - 11);
      context.textAlign = 'right'; context.fillStyle = '#444c5c';
      context.fillText('Space pause · R restart · S screenshot · Left/Right scrub · Esc quit', width - pad, height - 11);
      context.fillStyle = '#ffc45a'; context.fillText(`◆ t ${time.toFixed(2).padStart(5, '0')}s`, width - pad, 24);
      animationFrame = requestAnimationFrame(draw);
    };

    const handleVisibility = () => { if (!document.hidden && !animationFrame) { last = performance.now(); animationFrame = requestAnimationFrame(draw); } };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize(); animationFrame = requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', handleVisibility); if (animationFrame) cancelAnimationFrame(animationFrame); };
  }, [restartToken, season]);

  return <canvas ref={canvasRef} className="christmas-canvas" aria-label="Animated ASCII Christmas tree based on christmas_tree.py" />;
}

function christmasSeason(date: Date) {
  return date.getMonth() === 11 || (date.getMonth() === 0 && date.getDate() <= 7);
}

function seasonKey(date: Date) {
  return date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
}

export function ChristmasExperience() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [restartToken, setRestartToken] = useState(0);
  const [season, setSeason] = useState(0);
  useChristmasMusic(musicEnabled, paused || !open);

  useEffect(() => {
    const now = new Date();
    const forced = new URLSearchParams(window.location.search).get('christmas') === '1';
    if (!christmasSeason(now) && !forced) return undefined;
    const currentSeason = seasonKey(now);
    const storageKey = `christmas-tree-seen-${currentSeason}`;
    const alreadySeen = window.sessionStorage.getItem(storageKey) === 'true';
    const timer = window.setTimeout(() => { setSeason(currentSeason); setAvailable(true); if (forced || !alreadySeen) setOpen(true); }, 850);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => { setOpen(false); setMusicEnabled(false); window.sessionStorage.setItem(`christmas-tree-seen-${season}`, 'true'); };

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); setMusicEnabled(false); window.sessionStorage.setItem(`christmas-tree-seen-${season}`, 'true'); }
      if (event.code === 'Space') { event.preventDefault(); setPaused((value) => !value); }
      if (event.key.toLowerCase() === 'r') setRestartToken((value) => value + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, season]);

  if (!available) return null;
  return <>
    {!open && <button type="button" className="christmas-season-trigger" onClick={() => setOpen(true)}>Open Christmas reel</button>}
    {open && <div className="christmas-overlay" role="dialog" aria-modal="true" aria-labelledby="christmas-title">
      <div className="christmas-shell">
        <h2 id="christmas-title" className="christmas-sr-only">ASCII Christmas Tree</h2>
        <div className="christmas-actions"><button type="button" onClick={() => setPaused((value) => !value)}>{paused ? 'Play' : 'Pause'}</button><button type="button" aria-pressed={musicEnabled} onClick={() => setMusicEnabled((value) => !value)}>{musicEnabled ? 'Mute' : 'Music'}</button><button type="button" onClick={close}>Close</button></div>
        <div className="christmas-stage"><ChristmasCanvas paused={paused} restartToken={restartToken} season={season} /></div>
      </div>
    </div>}
  </>;
}
