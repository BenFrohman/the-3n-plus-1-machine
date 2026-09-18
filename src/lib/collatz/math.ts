export function collatzStep(n: number): number {
  return n % 2 === 0 ? n / 2 : 3 * n + 1;
}

export function accelStep(n: number): number {
  return n % 2 === 0 ? n / 2 : (3 * n + 1) / 2;
}

export function trajectory(n: number, cap = 4000): number[] {
  const out = [n];
  let x = n;
  const seen = new Set<number>([n]);
  while (x !== 1 && out.length < cap) {
    x = collatzStep(x);
    if (!Number.isFinite(x) || x <= 0) break;
    if (x > Number.MAX_SAFE_INTEGER) break;
    out.push(x);
    if (seen.has(x)) break;
    seen.add(x);
  }
  return out;
}

export function peakOf(traj: number[]): number {
  let p = traj[0] ?? 1;
  for (const v of traj) if (v > p) p = v;
  return p;
}

/** Inverse Collatz: always 2n; also (n-1)/3 when that is an odd integer > 1. */
export function predecessors(m: number): number[] {
  const out = [2 * m];
  if ((m - 1) % 3 === 0) {
    const b = (m - 1) / 3;
    if (b > 1 && b % 2 === 1) out.push(b);
  }
  return out;
}

/** First-k parity vector of the accelerated map, as an integer in [0, 2^k). */
export function parityVector(n: number, k: number): number {
  let m = n >>> 0;
  let v = 0;
  for (let i = 0; i < k; i++) {
    v |= (m & 1) << i;
    m = m % 2 === 0 ? m / 2 : (3 * m + 1) / 2;
  }
  return v;
}

export function formatInt(n: number): string {
  if (n >= 1e6) return n.toExponential(2).replace("e+", "e");
  return Math.round(n).toLocaleString("en-US");
}
