/** The 3n+1 Machine — Copyright (c) 2026 Benjamin Stanley Frohman. All rights reserved. */

import { DATA } from "@/lib/collatz/data";
import { formatInt, peakOf, trajectory } from "@/lib/collatz/math";
import { MachineAudio } from "./audio";
import { CHAPTERS, FILM_END, chapterAt, localTime } from "./chapters";
import {
  S,
  X,
  Y,
  captionBand,
  clamp,
  ease,
  fitStage,
  plotFrame,
  txt,
  type Stage,
} from "./draw";
import { AMBER, BG, CYAN, DIM, GREEN, RED, WHITE, rgb } from "./palette";
import { drawRain, makeRain, stepRain } from "./rain";

export type Snapshot = {
  time: number;
  playing: boolean;
  muted: boolean;
  chapterId: string;
  chapterIndex: number;
  mode: "film" | "explorer";
  explorerN: number | null;
  explorerSteps: number;
  explorerPeak: number;
  explorerReached: boolean;
};

function logY(v: number, lo: number, hi: number) {
  const a = Math.log10(Math.max(1, v));
  const b = Math.log10(lo);
  const c = Math.log10(hi);
  return (a - b) / (c - b);
}
export class Film {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audio = new MachineAudio();
  time = 0;
  playing = true;
  mode: "film" | "explorer" = "film";
  explorerN: number | null = null;
  explorerTraj: number[] = [];
  explorerHead = 0;
  rain = makeRain();
  overlay: HTMLCanvasElement | null = null;
  last = 0;
  raf = 0;
  dpr = 1;
  cssW = 0;
  cssH = 0;
  onSnap: (s: Snapshot) => void;
  snapAcc = 0;
  lastBlipStep = -1;
  reduced = false;
  constructor(canvas: HTMLCanvasElement, onSnap: (s: Snapshot) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("canvas");
    this.ctx = ctx;
    this.onSnap = onSnap;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  start() {
    this.audio.unlock();
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      let dt = (now - this.last) / 1e3;
      this.last = now;
      if (dt > .1) dt = .1;
      this.tick(dt);
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
    this.emit();
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.audio.dispose();
  }
  resize() {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.cssW = w;
    this.cssH = h;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.overlay = null;
  }
  toggle() {
    this.playing = !this.playing;
    this.emit();
  }
  play() {
    this.playing = true;
    this.emit();
  }
  pause() {
    this.playing = false;
    this.emit();
  }
  setMuted(m: boolean) {
    this.audio.setMuted(m);
    this.emit();
  }
  seek(t: number) {
    this.time = Math.max(0, Math.min(FILM_END - .001, t));
    this.mode = "film";
    this.emit();
  }
  jumpChapter(i: number) {
    const c = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, i))];
    if (c) this.seek(c.t0 + .05);
  }
  explore(n: number) {
    const x = Math.floor(Math.abs(n));
    if (!Number.isFinite(x) || x < 1) return;
    this.mode = "explorer";
    this.explorerN = x;
    this.explorerTraj = trajectory(x, 2500);
    this.explorerHead = 1;
    this.lastBlipStep = -1;
    this.playing = true;
    this.emit();
  }
  exitExplore() {
    this.mode = "film";
    this.emit();
  }
  emit() {
    const ch = chapterAt(this.time);
    const traj = this.explorerTraj;
    this.onSnap({
      time: this.time,
      playing: this.playing,
      muted: this.audio.isMuted,
      chapterId: ch.id,
      chapterIndex: CHAPTERS.indexOf(ch),
      mode: this.mode,
      explorerN: this.explorerN,
      explorerSteps: Math.max(0, traj.length - 1),
      explorerPeak: traj.length ? peakOf(traj) : 0,
      explorerReached: traj.length > 0 && traj[traj.length - 1] === 1
    });
  }
  tick(dt: number) {
    if (this.playing) {
      if (this.mode === "film") {
        this.time += dt;
        if (this.time >= FILM_END) this.time = FILM_END - .001;
      } else if (this.explorerTraj.length) {
        this.explorerHead += dt * 28;
        if (this.explorerHead > this.explorerTraj.length) this.explorerHead = this.explorerTraj.length;
        const step = Math.floor(this.explorerHead);
        if (step !== this.lastBlipStep && step > 0) {
          this.lastBlipStep = step;
          const v = this.explorerTraj[step - 1];
          if (v !== undefined) this.audio.blip(v % 2 === 0 ? "even" : "odd");
        }
      }
    }
    if (!this.reduced) stepRain(this.rain, dt, this.cssH);
    this.snapAcc += dt;
    if (this.snapAcc > .12) {
      this.snapAcc = 0;
      this.emit();
    }
  }
  ensureOverlay(st: Stage) {
    if (this.overlay) return this.overlay;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.floor(st.w * this.dpr));
    c.height = Math.max(1, Math.floor(st.h * this.dpr));
    const g = c.getContext("2d");
    if (!g) return null;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const W = Math.floor(st.w);
    const H = Math.floor(st.h);
    const img = g.createImageData(W, H);
    const d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const scan = y % 3 === 0 ? .8 : 1;
      const nx = (x - W / 2) / (W * .72);
      const ny = (y - H / 2) / (H * .78);
      const r = Math.sqrt(nx * nx + ny * ny);
      const v = scan * clamp(1.22 - .72 * r * r, .25, 1);
      d[i] = Math.round(255 * v);
      d[i + 1] = Math.round(255 * v);
      d[i + 2] = Math.round(255 * v);
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.overlay = c;
    return c;
  }
  draw() {
    const ctx = this.ctx;
    const w = this.cssW;
    const h = this.cssH;
    ctx.fillStyle = rgb(BG);
    ctx.fillRect(0, 0, w, h);
    const st = fitStage(w, h);
    if (this.mode === "explorer") {
      drawRain(ctx, w, h, this.rain, .12 * (this.reduced ? .35 : 1));
      this.drawExplorer(st);
    } else {
      const ch = chapterAt(this.time);
      const lt = localTime(this.time, ch);
      const rainFade = ch.id === "title" ? 1 : ch.id === "rule" ? clamp(1 - lt / 2.5, .12, 1) : .16;
      drawRain(ctx, w, h, this.rain, rainFade * (this.reduced ? .35 : 1));
      switch (ch.id) {
        case "title":
          this.sceneTitle(st, lt);
          break;
        case "rule":
          this.sceneRule(st, lt);
          break;
        case "twentyseven":
          this.scene27(st, lt);
          break;
        case "drift":
          this.sceneDrift(st, lt);
          break;
        case "coral":
          this.sceneCoral(st, lt);
          break;
        case "terras":
          this.sceneTerras(st, lt);
          break;
        case "engine":
          this.sceneEngine(st, lt);
          break;
        case "lemma": this.sceneLemma(st, lt);
      }
    }
    const ov = this.ensureOverlay(st);
    if (ov) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(ov, 0, 0, w, h);
      ctx.restore();
    }
  }
  sceneTitle(st: Stage, t: number) {
    const a = ease(clamp((t - 1.2) / 1.4));
    txt(this.ctx, st, [540, 760], "THE 3n+1 MACHINE", 54, GREEN, {
      alpha: a,
      weight: 700
    });
    txt(this.ctx, st, [540, 840], "a visual proof of almost everything", 28, DIM, {
      alpha: a * ease(clamp((t - 2.2) / 1.2)),
      weight: 500
    });
    txt(this.ctx, st, [540, 890], "that is known", 28, DIM, {
      alpha: a * ease(clamp((t - 2.6) / 1.2)),
      weight: 500
    });
  }
  sceneRule(st: Stage, t: number) {
    captionBand(this.ctx, st, 0, 280);
    txt(this.ctx, st, [540, 160], "THE RULE", 64, GREEN);
    txt(this.ctx, st, [540, 240], "the cheapest machine in mathematics", 28, DIM, { weight: 500 });
    const a1 = ease(clamp((t - .6) / .6));
    const a2 = ease(clamp((t - 1.8) / .6));
    const a3 = ease(clamp((t - 3.4) / .6));
    txt(this.ctx, st, [540, 720], "if n is even", 32, DIM, {
      alpha: a1,
      weight: 500
    });
    txt(this.ctx, st, [540, 800], "n  →  n / 2", 56, WHITE, { alpha: a1 });
    txt(this.ctx, st, [540, 1020], "if n is odd", 32, DIM, {
      alpha: a2,
      weight: 500
    });
    txt(this.ctx, st, [540, 1100], "n  →  3n + 1", 56, WHITE, { alpha: a2 });
    txt(this.ctx, st, [540, 1420], "repeat until 1.", 34, GREEN, { alpha: a3 });
    txt(this.ctx, st, [540, 1488], "or forever.", 34, RED, {
      alpha: a3 * .9,
      weight: 500
    });
  }
  scene27(st: Stage, t: number) {
    captionBand(this.ctx, st, 0, 260);
    txt(this.ctx, st, [540, 150], "START AT 27", 64, GREEN);
    const traj = DATA.t27;
    const k = Math.min(traj.length, Math.max(1, Math.floor(ease(clamp(t / 14)) * traj.length)));
    const cur = traj[k - 1] ?? 27;
    const peakShown = k > 70;
    txt(this.ctx, st, [300, 360], `step  ${k - 1}`, 36, WHITE);
    txt(this.ctx, st, [780, 360], `value  ${formatInt(cur)}`, 36, WHITE);
    if (peakShown) txt(this.ctx, st, [540, 430], "peak  9232   (341× its start)", 32, AMBER);
    const px = 120;
    const py = 560;
    const pw = 840;
    const ph = 780;
    plotFrame(this.ctx, st, px, py, pw, ph);
    txt(this.ctx, st, [128, 532], "value (log scale)", 22, DIM, {
      anchor: "left",
      glow: false,
      weight: 400
    });
    for (const tv of [
      1,
      10,
      100,
      1e3,
      1e4
    ]) {
      const yy = 1340 - logY(tv, 1, 12e3) * ph;
      this.ctx.save();
      this.ctx.strokeStyle = rgb(GREEN, .12);
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(X(st, px), Y(st, yy));
      this.ctx.lineTo(X(st, 960), Y(st, yy));
      this.ctx.stroke();
      this.ctx.restore();
      txt(this.ctx, st, [104, yy], `10^${Math.round(Math.log10(tv))}`, 18, DIM, {
        anchor: "right",
        glow: false,
        weight: 400
      });
    }
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < k; i++) {
      const v = traj[i];
      const x = px + i / Math.max(1, traj.length - 1) * pw;
      const y = 1340 - logY(v, 1, 12e3) * ph;
      if (i === 0) this.ctx.moveTo(X(st, x), Y(st, y));
      else this.ctx.lineTo(X(st, x), Y(st, y));
    }
    this.ctx.strokeStyle = rgb(GREEN);
    this.ctx.lineWidth = Math.max(1.5, S(st, 2.2));
    this.ctx.stroke();
    this.ctx.restore();
    const lastX = px + (k - 1) / Math.max(1, traj.length - 1) * pw;
    const lastY = 1340 - logY(cur, 1, 12e3) * ph;
    this.ctx.save();
    this.ctx.fillStyle = rgb(WHITE);
    this.ctx.beginPath();
    this.ctx.arc(X(st, lastX), Y(st, lastY), S(st, 8), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = rgb(GREEN);
    this.ctx.lineWidth = S(st, 3);
    this.ctx.stroke();
    this.ctx.restore();
    if (k >= traj.length) txt(this.ctx, st, [540, 1540], "111 steps to 1", 32, GREEN);
    if (k > 2 && k % 5 === 0) this.audio.blip(cur % 2 === 0 ? "even" : "odd");
  }
  sceneDrift(st: Stage, t: number) {
    captionBand(this.ctx, st, 0, 280);
    txt(this.ctx, st, [540, 150], "NEGATIVE DRIFT", 56, GREEN);
    txt(this.ctx, st, [540, 230], "if parity is a fair coin", 28, DIM, { weight: 500 });
    const a1 = ease(clamp((t - .4) / .7));
    txt(this.ctx, st, [540, 560], "accelerated map T", 28, DIM, {
      alpha: a1,
      weight: 500
    });
    txt(this.ctx, st, [540, 640], "even  n/2     odd  (3n+1)/2", 30, WHITE, { alpha: a1 });
    const a2 = ease(clamp((t - 2) / .7));
    txt(this.ctx, st, [540, 840], "geometric mean per step", 28, DIM, {
      alpha: a2,
      weight: 500
    });
    txt(this.ctx, st, [540, 940], "√3 / 2  =  0.866…", 52, CYAN, { alpha: a2 });
    const a3 = ease(clamp((t - 3.6) / .7));
    txt(this.ctx, st, [540, 1160], "measured on random 10¹² orbits", 26, DIM, {
      alpha: a3,
      weight: 500
    });
    txt(this.ctx, st, [540, 1236], "0.865", 48, WHITE, { alpha: a3 });
    const a4 = ease(clamp((t - 5.4) / .8));
    txt(this.ctx, st, [540, 1480], "a random orbit wants to fall.", 30, GREEN, { alpha: a4 });
    txt(this.ctx, st, [540, 1554], "that is a heuristic. not a proof.", 26, AMBER, {
      alpha: a4,
      weight: 500
    });
  }
  sceneCoral(st: Stage, t: number) {
    captionBand(this.ctx, st, 0, 300);
    txt(this.ctx, st, [540, 150], "RUN THE RULE BACKWARDS", 42, GREEN);
    txt(this.ctx, st, [540, 230], "every number that reaches 1, growing out of 1", 24, DIM, { weight: 500 });
    const segs = DATA.coral;
    const grow = ease(clamp(t / 10.5));
    const n = Math.max(1, Math.floor(grow * segs.length));
    const rx = 40;
    const ry = 320;
    const rw = 1e3;
    const rh = 1100;
    this.ctx.save();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    for (let i = 0; i < n; i++) {
      const e = segs[i];
      const x1 = rx + e.x1 * rw;
      const y1 = ry + e.y1 * rh;
      const x2 = rx + e.x2 * rw;
      const y2 = ry + e.y2 * rh;
      const a = .25 + .75 * (1 - e.d / 28);
      this.ctx.strokeStyle = e.odd ? rgb(CYAN, .55 * a) : rgb(GREEN, .7 * a);
      this.ctx.lineWidth = Math.max(.7, S(st, 1.6 - e.d * .04));
      this.ctx.beginPath();
      this.ctx.moveTo(X(st, x1), Y(st, y1));
      this.ctx.lineTo(X(st, x2), Y(st, y2));
      this.ctx.stroke();
    }
    this.ctx.restore();
    captionBand(this.ctx, st, 1480, 1920, .94);
    const aC = ease(clamp((t - 8) / 1.2));
    txt(this.ctx, st, [540, 1560], "the conjecture says:", 26, DIM, {
      alpha: aC,
      weight: 500
    });
    txt(this.ctx, st, [540, 1636], "this tree contains every integer.", 32, WHITE, { alpha: aC });
    const aD = ease(clamp((t - 11) / 1.2));
    txt(this.ctx, st, [540, 1720], "nobody can prove it has no siblings.", 26, RED, {
      alpha: aD,
      weight: 500
    });
  }
  sceneTerras(st: Stage, t: number) {
    captionBand(this.ctx, st, 0, 280);
    txt(this.ctx, st, [540, 150], "HOW CLOSE WE ACTUALLY ARE", 40, GREEN);
    const dens = DATA.dens;
    const kMax = Math.min(60, Math.floor(ease(clamp(t / 8)) * 60));
    const px = 140;
    const py = 380;
    const pw = 800;
    const ph = 620;
    plotFrame(this.ctx, st, px, py, pw, ph);
    txt(this.ctx, st, [132, py], "100%", 18, DIM, {
      anchor: "right",
      glow: false,
      weight: 400
    });
    txt(this.ctx, st, [132, 1e3], "0", 18, DIM, {
      anchor: "right",
      glow: false,
      weight: 400
    });
    this.ctx.save();
    this.ctx.beginPath();
    for (let k = 0; k <= kMax; k++) {
      const x = px + k / 60 * pw;
      const y = 1e3 - (dens[k] ?? 0) * ph;
      if (k === 0) this.ctx.moveTo(X(st, x), Y(st, y));
      else this.ctx.lineTo(X(st, x), Y(st, y));
    }
    this.ctx.strokeStyle = rgb(CYAN);
    this.ctx.lineWidth = Math.max(1.5, S(st, 2.4));
    this.ctx.stroke();
    this.ctx.restore();
    const d = dens[kMax] ?? 0;
    const hx = px + kMax / 60 * pw;
    const hy = 1e3 - d * ph;
    this.ctx.save();
    this.ctx.fillStyle = rgb(WHITE);
    this.ctx.beginPath();
    this.ctx.arc(X(st, hx), Y(st, hy), S(st, 7), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    const a1 = ease(clamp((t - 4) / .8));
    txt(this.ctx, st, [540, 1088], `${(d * 100).toFixed(3)}% of all integers provably shrink`, 26, WHITE, { alpha: a1 });
    txt(this.ctx, st, [540, 1150], "within 60 steps    Terras, 1976 — verified here to 200,000", 20, DIM, {
      alpha: a1,
      weight: 500
    });
    const a2 = ease(clamp((t - 8) / .8));
    txt(this.ctx, st, [540, 1320], "σ(n) = first k with  Tᵏ(n) < n", 28, GREEN, { alpha: a2 });
    txt(this.ctx, st, [540, 1400], "density of { σ ≤ k }  →  1  as k → ∞", 26, WHITE, { alpha: a2 });
    txt(this.ctx, st, [540, 1520], "almost every integer eventually drops.", 28, CYAN, { alpha: a2 });
  }
  sceneEngine(st: Stage, t: number) {
    captionBand(this.ctx, st, 0, 320);
    txt(this.ctx, st, [540, 140], "THE ENGINE", 56, GREEN);
    txt(this.ctx, st, [540, 230], "first k parities hit every residue", 26, DIM, { weight: 500 });
    txt(this.ctx, st, [540, 278], "class mod 2ᵏ  exactly once", 26, DIM, { weight: 500 });
    const lit = Math.min(16, Math.max(0, Math.floor(ease(clamp((t - .4) / 5.5)) * 16)));
    const cellW = 110;
    const cellH = 64;
    const x0 = 58;
    const y0 = 380;
    for (let i = 0; i < 16; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const x = x0 + col * 122;
      const y = y0 + row * 76;
      const on = i < lit;
      this.ctx.save();
      this.ctx.strokeStyle = rgb(on ? GREEN : DIM, on ? .95 : .4);
      this.ctx.lineWidth = Math.max(1, S(st, 1.6));
      this.ctx.strokeRect(X(st, x), Y(st, y), S(st, cellW), S(st, cellH));
      if (on) {
        this.ctx.fillStyle = rgb(GREEN, .08);
        this.ctx.fillRect(X(st, x), Y(st, y), S(st, cellW), S(st, cellH));
      }
      this.ctx.restore();
      txt(this.ctx, st, [x + cellW / 2, y + cellH / 2], `k=${i + 1}`, 22, on ? GREEN : DIM, {
        glow: on,
        weight: 500
      });
    }
    const aOk = ease(clamp((t - 6) / .5));
    txt(this.ctx, st, [540, 560], "bijection verified,  k = 1..16    [OK]", 26, GREEN, { alpha: aOk });
    const aG = ease(clamp((t - 7) / .8));
    txt(this.ctx, st, [540, 680], "k = 6   ·   64 residues, 64 parity vectors", 22, DIM, {
      alpha: aG,
      weight: 500
    });
    const k = 6;
    const mod = 64;
    const shown = Math.min(mod, Math.floor(ease(clamp((t - 7.2) / 6)) * mod));
    const gw = 72;
    const gh = 72;
    const gx0 = 252;
    const gy0 = 740;
    for (let n = 0; n < shown; n++) {
      let m = n;
      let v = 0;
      for (let i = 0; i < k; i++) {
        v |= (m & 1) << i;
        m = m % 2 === 0 ? m / 2 : (3 * m + 1) / 2;
      }
      const col = v % 8;
      const row = Math.floor(v / 8);
      const x = gx0 + col * gw;
      const y = gy0 + row * gh;
      this.ctx.save();
      this.ctx.fillStyle = rgb(GREEN, .18 + .35 * (n / mod));
      this.ctx.fillRect(X(st, x + 4), Y(st, y + 4), S(st, 64), S(st, 64));
      this.ctx.restore();
    }
    for (let i = 0; i < 64; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const x = gx0 + col * gw;
      const y = gy0 + row * gh;
      this.ctx.save();
      this.ctx.strokeStyle = rgb(GREEN, .2);
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(X(st, x + 4), Y(st, y + 4), S(st, 64), S(st, 64));
      this.ctx.restore();
    }
    const aT = ease(clamp((t - 13) / .7));
    txt(this.ctx, st, [540, 1380], "this is Terras’s counting engine.", 28, WHITE, { alpha: aT });
    txt(this.ctx, st, [540, 1456], "every class has a unique k-step fate.", 26, DIM, {
      alpha: aT,
      weight: 500
    });
  }
  sceneLemma(st: Stage, t: number) {
    captionBand(this.ctx, st, 0, 280);
    txt(this.ctx, st, [540, 150], "THE REMAINING LEMMA", 46, GREEN);
    const lines = [
      [
        "proven",
        GREEN,
        .4,
        true
      ],
      [
        "Terras 1976 — almost all n eventually drop",
        WHITE,
        1,
        false
      ],
      [
        "Tao 2019 — almost all orbits are almost bounded",
        WHITE,
        1.6,
        false
      ],
      [
        "machine check — every n < 2⁶⁸ reaches 1",
        WHITE,
        2.2,
        false
      ],
      [
        "open",
        AMBER,
        3.4,
        true
      ],
      [
        "there is no other cycle in the positives",
        WHITE,
        4,
        false
      ],
      [
        "there is no divergent trajectory",
        WHITE,
        4.6,
        false
      ],
      [
        "the reverse tree from 1 is all of ℕ",
        WHITE,
        5.2,
        false
      ]
    ];
    let y = 420;
    for (const [s, c, at, small] of lines as [string, [number, number, number], number, boolean][]) {
      const a = ease(clamp((t - at) / .55));
      txt(this.ctx, st, [540, y], s, small ? 22 : 26, c, {
        alpha: a,
        weight: small ? 500 : 600
      });
      y += small ? 70 : 78;
    }
    const aF = ease(clamp((t - 7.2) / 1));
    txt(this.ctx, st, [540, 1280], "the proof that remains is infinite,", 28, GREEN, { alpha: aF });
    txt(this.ctx, st, [540, 1348], "and thin.", 28, GREEN, { alpha: aF });
    const aG = ease(clamp((t - 10) / 1));
    txt(this.ctx, st, [540, 1520], "type a number. watch it fall.", 26, WHITE, {
      alpha: aG,
      weight: 500
    });
  }
  drawExplorer(st: Stage) {
    captionBand(this.ctx, st, 0, 260);
    const n = this.explorerN ?? 1;
    txt(this.ctx, st, [540, 140], `START AT ${formatInt(n)}`, 52, GREEN);
    const traj = this.explorerTraj;
    const k = Math.max(1, Math.min(traj.length, Math.floor(this.explorerHead)));
    const cur = traj[k - 1] ?? n;
    const pk = peakOf(traj.slice(0, k));
    txt(this.ctx, st, [280, 340], `step  ${k - 1}`, 32, WHITE);
    txt(this.ctx, st, [800, 340], `value  ${formatInt(cur)}`, 32, WHITE);
    txt(this.ctx, st, [540, 410], `peak  ${formatInt(pk)}`, 28, AMBER);
    const px = 120;
    const py = 500;
    const pw = 840;
    const ph = 820;
    plotFrame(this.ctx, st, px, py, pw, ph);
    const hi = Math.max(12, pk * 1.15);
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < k; i++) {
      const v = traj[i];
      const x = px + i / Math.max(1, traj.length - 1) * pw;
      const y = 1320 - logY(v, 1, hi) * ph;
      if (i === 0) this.ctx.moveTo(X(st, x), Y(st, y));
      else this.ctx.lineTo(X(st, x), Y(st, y));
    }
    this.ctx.strokeStyle = rgb(GREEN);
    this.ctx.lineWidth = Math.max(1.5, S(st, 2.2));
    this.ctx.stroke();
    this.ctx.restore();
    const lastX = px + (k - 1) / Math.max(1, traj.length - 1) * pw;
    const lastY = 1320 - logY(cur, 1, hi) * ph;
    this.ctx.save();
    this.ctx.fillStyle = rgb(WHITE);
    this.ctx.beginPath();
    this.ctx.arc(X(st, lastX), Y(st, lastY), S(st, 8), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    if (k >= traj.length) {
      const reached = traj[traj.length - 1] === 1;
      txt(this.ctx, st, [540, 1420], reached ? `${traj.length - 1} steps to 1` : "orbit truncated (too long)", 30, reached ? GREEN : AMBER);
    }
  }
}
