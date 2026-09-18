import { fade, rgb, GREEN as G, WHITE } from "./palette";

export type RGB = [number, number, number];

export function ease(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function clamp(v: number, a = 0, b = 1): number {
  return Math.max(a, Math.min(b, v));
}

export type Stage = {
  w: number;
  h: number;
  ox: number;
  oy: number;
  s: number;
  LW: number;
  LH: number;
};

export function fitStage(w: number, h: number): Stage {
  const LW = 1080;
  const LH = 1920;
  const top = Math.min(88, h * 0.1);
  const bot = Math.min(108, h * 0.14);
  const availH = Math.max(200, h - top - bot);
  const s = Math.min(w / LW, availH / LH);
  return {
    w,
    h,
    s,
    LW,
    LH,
    ox: (w - LW * s) / 2,
    oy: top + (availH - LH * s) / 2,
  };
}

export function X(st: Stage, x: number): number {
  return st.ox + x * st.s;
}
export function Y(st: Stage, y: number): number {
  return st.oy + y * st.s;
}
export function S(st: Stage, n: number): number {
  return n * st.s;
}

export function font(st: Stage, px: number, weight = 600): string {
  return `${weight} ${Math.max(8, S(st, px))}px "IBM Plex Mono", ui-monospace, monospace`;
}

export function txt(
  ctx: CanvasRenderingContext2D,
  st: Stage,
  xy: [number, number],
  s: string,
  px: number,
  c: RGB = G,
  opts: {
    anchor?: CanvasTextAlign;
    glow?: boolean;
    weight?: number;
    baseline?: CanvasTextBaseline;
    alpha?: number;
  } = {},
) {
  const {
    anchor = "center",
    glow = true,
    weight = 600,
    baseline = "middle",
    alpha = 1,
  } = opts;
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.font = font(st, px, weight);
  ctx.textAlign = anchor;
  ctx.textBaseline = baseline;
  ctx.globalAlpha = alpha;
  const x = X(st, xy[0]);
  const y = Y(st, xy[1]);
  if (glow) {
    ctx.fillStyle = rgb(fade(c, 0.32));
    const g = Math.max(1, S(st, 2));
    ctx.fillText(s, x - g, y);
    ctx.fillText(s, x + g, y);
    ctx.fillText(s, x, y - g);
    ctx.fillText(s, x, y + g);
  }
  ctx.fillStyle = rgb(c);
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function fillStage(
  ctx: CanvasRenderingContext2D,
  st: Stage,
  c: RGB = [2, 5, 4],
) {
  ctx.fillStyle = rgb(c);
  ctx.fillRect(X(st, 0), Y(st, 0), S(st, st.LW), S(st, st.LH));
}

export function captionBand(
  ctx: CanvasRenderingContext2D,
  st: Stage,
  y0: number,
  y1: number,
  a = 0.92,
) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = rgb([2, 5, 4]);
  ctx.fillRect(X(st, 0), Y(st, y0), S(st, st.LW), S(st, y1 - y0));
  ctx.restore();
}

export function plotFrame(
  ctx: CanvasRenderingContext2D,
  st: Stage,
  x: number,
  y: number,
  w: number,
  h: number,
  a = 0.85,
) {
  ctx.save();
  ctx.strokeStyle = rgb(G, 0.35 * a);
  ctx.lineWidth = Math.max(1, S(st, 1.5));
  ctx.strokeRect(X(st, x), Y(st, y), S(st, w), S(st, h));
  ctx.restore();
}

export { WHITE, G as GREEN };
