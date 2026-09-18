export const GREEN: [number, number, number] = [60, 255, 150];
export const DIM: [number, number, number] = [22, 110, 70];
export const DARK: [number, number, number] = [10, 46, 30];
export const WHITE: [number, number, number] = [235, 255, 245];
export const CYAN: [number, number, number] = [90, 220, 255];
export const AMBER: [number, number, number] = [255, 190, 70];
export const RED: [number, number, number] = [255, 90, 90];
export const BG: [number, number, number] = [2, 5, 4];

export function rgb(c: [number, number, number], a = 1): string {
  if (a >= 1) return `rgb(${c[0]},${c[1]},${c[2]})`;
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export function fade(
  c: [number, number, number],
  t: number,
): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [Math.round(c[0] * u), Math.round(c[1] * u), Math.round(c[2] * u)];
}

export function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}
