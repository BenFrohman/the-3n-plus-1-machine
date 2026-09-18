export type ChapterId =
  | "title"
  | "rule"
  | "twentyseven"
  | "drift"
  | "coral"
  | "terras"
  | "engine"
  | "lemma";

export type Chapter = {
  id: ChapterId;
  t0: number;
  t1: number;
  label: string;
  kicker: string;
};

export const CHAPTERS: Chapter[] = [
  { id: "title", t0: 0, t1: 7.5, label: "The machine", kicker: "01" },
  { id: "rule", t0: 7.5, t1: 16.5, label: "The rule", kicker: "02" },
  { id: "twentyseven", t0: 16.5, t1: 34, label: "Start at 27", kicker: "03" },
  { id: "drift", t0: 34, t1: 46, label: "Negative drift", kicker: "04" },
  { id: "coral", t0: 46, t1: 64, label: "Run it backwards", kicker: "05" },
  { id: "terras", t0: 64, t1: 80, label: "Almost all fall", kicker: "06" },
  { id: "engine", t0: 80, t1: 96, label: "The engine", kicker: "07" },
  { id: "lemma", t0: 96, t1: 114, label: "The remaining lemma", kicker: "08" },
];

export const FILM_END = CHAPTERS[CHAPTERS.length - 1]!.t1;

export function chapterAt(t: number): Chapter {
  const x = ((t % FILM_END) + FILM_END) % FILM_END;
  for (const c of CHAPTERS) if (x < c.t1) return c;
  return CHAPTERS[CHAPTERS.length - 1]!;
}

export function localTime(t: number, c: Chapter): number {
  return t - c.t0;
}
