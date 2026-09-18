import raw from "./data.json";

export type CoralSeg = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  odd: number;
  d: number;
};

export type CollatzData = {
  t27: number[];
  peak27: number;
  steps27: number;
  dens: number[];
  densN: number;
  drift: number;
  driftMeasured: number;
  coral: CoralSeg[];
  coralNodes: number;
  bij: Record<string, boolean>;
};

export const DATA = raw as CollatzData;
