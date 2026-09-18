type Col = { y: number; v: number; g: string[] };

const GLYPHS = "0123456789";

export function makeRain(seed = 3, n = 36): Col[] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const pick = () => GLYPHS[(rnd() * 10) | 0]!;
  return Array.from({ length: n }, () => ({
    y: rnd() * -800,
    v: 70 + rnd() * 140,
    g: Array.from({ length: 32 }, pick),
  }));
}

export function stepRain(cols: Col[], dt: number, height: number) {
  for (const c of cols) {
    c.y += c.v * dt;
    if (c.y > height + 400) {
      c.y = -500 - Math.random() * 300;
      c.v = 70 + Math.random() * 140;
    }
    if (Math.random() < 0.15 * dt * 30) {
      c.g[(Math.random() * c.g.length) | 0] = GLYPHS[(Math.random() * 10) | 0]!;
    }
  }
}

export function drawRain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cols: Col[],
  fadeA = 1,
) {
  const N = cols.length;
  const CW = w / N;
  ctx.save();
  ctx.font = `500 ${Math.max(11, Math.floor(w / 42))}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const gap = Math.max(16, h / 48);
  for (let i = 0; i < N; i++) {
    const c = cols[i]!;
    const x = i * CW + CW / 2;
    for (let k = 0; k < 22; k++) {
      const y = c.y - k * gap;
      if (y < -40 || y > h + 40) continue;
      const a = (1 - k / 22) * fadeA;
      if (a < 0.04) continue;
      if (k === 0) {
        ctx.fillStyle = `rgba(${Math.round(230 * a)},${Math.round(255 * a)},${Math.round(200 * a)},1)`;
      } else {
        ctx.fillStyle = `rgba(${Math.round(12 * a)},${Math.round(200 * a)},${Math.round(120 * a)},1)`;
      }
      ctx.fillText(c.g[k % c.g.length]!, x, y);
    }
  }
  ctx.restore();
}
