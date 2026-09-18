import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Hash,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { SignInGate } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CHAPTERS, FILM_END } from "@/lib/machine/chapters";
import { Film, type Snapshot } from "@/lib/machine/film";
import {
  listMyOrbits,
  listMyShares,
  publishProof,
  saveOrbit,
  type OrbitRow,
  type ShareRow,
} from "@/lib/orbits/api";
import { DEFAULT_BYLINE, publishedName } from "@/lib/orbits/names";
import { cn } from "@/lib/utils";
import { AuthSlot } from "./AuthSlot";

const PRESETS = [7, 27, 41, 649, 837799];

const INITIAL: Snapshot = {
  time: 0,
  playing: true,
  muted: false,
  chapterId: "title",
  chapterIndex: 0,
  mode: "film",
  explorerN: null,
  explorerSteps: 0,
  explorerPeak: 0,
  explorerReached: false,
};

type Panel = "explore" | "library" | "share" | null;

export function MachineApp({
  attribution,
  featuredN,
}: {
  attribution?: string;
  featuredN?: number;
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<Film | null>(null);
  const [started, setStarted] = useState(false);
  const [snap, setSnap] = useState<Snapshot>(INITIAL);
  const [query, setQuery] = useState(featuredN ? String(featuredN) : "27");
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBy, setShareBy] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "publishing" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [byline, setByline] = useState(DEFAULT_BYLINE);
  const { user } = useCurrentUserState();

  const onSnap = useCallback((s: Snapshot) => {
    setSnap((prev) => {
      if (
        prev.time === s.time &&
        prev.playing === s.playing &&
        prev.muted === s.muted &&
        prev.chapterIndex === s.chapterIndex &&
        prev.mode === s.mode &&
        prev.explorerN === s.explorerN &&
        prev.explorerSteps === s.explorerSteps
      ) {
        return prev;
      }
      return s;
    });
  }, []);

  useEffect(() => {
    if (user?.displayName) setByline(publishedName(user.displayName));
  }, [user?.displayName]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const film = new Film(canvas, onSnap);
    filmRef.current = film;
    film.resize();
    film.start();
    if (featuredN && featuredN >= 1) film.explore(featuredN);
    const onResize = () => film.resize();
    window.addEventListener("resize", onResize);
    const vis = () => {
      if (document.visibilityState === "visible") film.audio.resume();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", vis);
      film.destroy();
      filmRef.current = null;
    };
  }, [started, onSnap, featuredN]);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      const film = filmRef.current;
      if (!film) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        film.toggle();
      } else if (e.code === "ArrowRight") {
        film.jumpChapter(Math.min(CHAPTERS.length - 1, snap.chapterIndex + 1));
      } else if (e.code === "ArrowLeft") {
        film.jumpChapter(Math.max(0, snap.chapterIndex - 1));
      } else if (e.code === "KeyM") {
        film.setMuted(!snap.muted);
      } else if (e.code === "Escape") {
        if (film.mode === "explorer") film.exitExplore();
        setPanel(null);
        setChaptersOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, snap.chapterIndex, snap.muted]);

  function begin() {
    setStarted(true);
  }

  function runExplore(raw: string) {
    const n = Number.parseInt(raw.replace(/[,\s]/g, ""), 10);
    if (!Number.isFinite(n) || n < 1) return;
    filmRef.current?.explore(n);
    setPanel(null);
    setSaveState("idle");
    setShareUrl(null);
  }

  async function onSave() {
    if (snap.explorerN == null) return;
    setSaveState("saving");
    try {
      await saveOrbit({
        data: {
          n: String(snap.explorerN),
          steps: snap.explorerSteps,
          peak: String(snap.explorerPeak),
          reached: snap.explorerReached,
        },
      });
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      if (err instanceof Error && err.message === "Unauthorized") setPanel("library");
    }
  }

  async function onPublish() {
    setShareState("publishing");
    setCopied(false);
    try {
      const res = await publishProof({
        data: {
          byline,
          n: snap.explorerN != null ? String(snap.explorerN) : undefined,
          steps: snap.explorerSteps,
          peak: snap.explorerPeak != null ? String(snap.explorerPeak) : undefined,
          reached: snap.explorerReached,
        },
      });
      const url = `${window.location.origin}/p/${res.slug}`;
      setShareUrl(url);
      setShareBy(res.byline);
      setShareState("idle");
      if (snap.explorerN != null) setSaveState("saved");
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        /* clipboard may be blocked */
      }
    } catch {
      setShareUrl(null);
      setShareBy(null);
      setShareState("error");
    }
  }

  const progress = snap.mode === "film" ? snap.time / FILM_END : 1;
  const ch = CHAPTERS[snap.chapterIndex] ?? CHAPTERS[0]!;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label="Collatz visual proof"
      />

      {!started && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-bg px-6 text-center">
          <div className="absolute top-4 right-4">
            <AuthSlot />
          </div>
          <div className="flex max-w-md flex-col items-center gap-5">
            <p className="gate-item text-xs tracking-[0.35em] text-muted uppercase">
              Collatz · 3n+1
            </p>
            <h1 className="gate-item text-balance text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
              THE 3n+1 MACHINE
            </h1>
            {attribution ? (
              <p className="gate-item text-sm text-fg">a proof by {attribution}</p>
            ) : (
              <p className="gate-item max-w-sm text-pretty text-sm leading-relaxed text-muted">
                A visual proof of almost everything that is known — Terras, the reverse tree,
                the parity engine — and the lemma that remains.
              </p>
            )}
            {featuredN ? (
              <p className="gate-item text-xs text-muted">featured orbit {featuredN.toLocaleString("en-US")}</p>
            ) : null}
            <button
              type="button"
              onClick={begin}
              className="gate-item mt-2 min-h-11 rounded-lg bg-primary px-8 text-sm font-semibold text-bg transition-[transform,background-color] duration-150 ease-out hover:bg-fg active:scale-[0.96]"
            >
              Begin the proof
            </button>
            <p className="gate-item text-[10px] tracking-wide text-muted">
              © 2026 Benjamin Stanley Frohman. All rights reserved.
            </p>
          </div>
        </div>
      )}

      {started && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
          <header className="pointer-events-auto flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setChaptersOpen((v) => !v)}
              className="rounded-md border border-border bg-surface/80 px-3 py-2 text-left backdrop-blur-sm"
            >
              <p className="text-[10px] tracking-[0.22em] text-muted uppercase">{ch.kicker}</p>
              <p className="text-sm text-fg">{ch.label}</p>
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <IconBtn
                label={snap.muted ? "Unmute" : "Mute"}
                onClick={() => filmRef.current?.setMuted(!snap.muted)}
              >
                {snap.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </IconBtn>
              <IconBtn
                label="Saved orbits"
                onClick={() => {
                  setPanel("library");
                  setChaptersOpen(false);
                }}
              >
                <Bookmark className="size-4" />
              </IconBtn>
              <IconBtn
                label="Publish a proof"
                onClick={() => {
                  setPanel("share");
                  setChaptersOpen(false);
                }}
              >
                <Share2 className="size-4" />
              </IconBtn>
              <IconBtn
                label="Try a number"
                onClick={() => {
                  setPanel("explore");
                  setChaptersOpen(false);
                }}
              >
                <Hash className="size-4" />
              </IconBtn>
              <AuthSlot />
            </div>
          </header>

          {chaptersOpen && (
            <nav className="pointer-events-auto absolute top-16 left-3 z-20 w-[min(18rem,calc(100%-1.5rem))] rounded-xl border border-border bg-surface p-2 shadow-lg sm:left-5">
              {CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    filmRef.current?.jumpChapter(i);
                    setChaptersOpen(false);
                    if (filmRef.current?.mode === "explorer") filmRef.current.exitExplore();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-[background-color] duration-150",
                    i === snap.chapterIndex && snap.mode === "film"
                      ? "bg-surface-2 text-primary"
                      : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <span className="w-6 tabular-nums text-xs">{c.kicker}</span>
                  {c.label}
                </button>
              ))}
            </nav>
          )}

          <footer className="pointer-events-auto flex flex-col gap-3">
            {attribution && (
              <p className="text-center text-xs tracking-wide text-muted">a proof by {attribution}</p>
            )}
            {snap.mode === "explorer" && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface/80 px-3 py-2 text-xs text-muted backdrop-blur-sm">
                <span>
                  orbit of {snap.explorerN} · {snap.explorerSteps} steps
                  {snap.explorerReached ? " · reaches 1" : ""}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-primary"
                    onClick={() => void onSave()}
                  >
                    {saveState === "saved"
                      ? "saved"
                      : saveState === "saving"
                        ? "saving…"
                        : saveState === "error"
                          ? "retry save"
                          : "save"}
                  </button>
                  <button
                    type="button"
                    className="text-primary"
                    onClick={() => setPanel("share")}
                  >
                    share
                  </button>
                  <button
                    type="button"
                    className="text-primary"
                    onClick={() => filmRef.current?.exitExplore()}
                  >
                    back to proof
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <IconBtn
                label={snap.playing ? "Pause" : "Play"}
                onClick={() => filmRef.current?.toggle()}
              >
                {snap.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </IconBtn>
              <IconBtn
                label="Previous chapter"
                onClick={() => filmRef.current?.jumpChapter(Math.max(0, snap.chapterIndex - 1))}
              >
                <ChevronLeft className="size-4" />
              </IconBtn>
              <IconBtn
                label="Next chapter"
                onClick={() =>
                  filmRef.current?.jumpChapter(Math.min(CHAPTERS.length - 1, snap.chapterIndex + 1))
                }
              >
                <ChevronRight className="size-4" />
              </IconBtn>
              <button
                type="button"
                aria-label="Seek"
                className="relative h-11 flex-1"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const p = (e.clientX - rect.left) / rect.width;
                  filmRef.current?.seek(p * FILM_END);
                }}
              >
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                <span
                  className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-primary"
                  style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                />
                {CHAPTERS.map((c) => (
                  <span
                    key={c.id}
                    className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted"
                    style={{ left: `${(c.t0 / FILM_END) * 100}%` }}
                  />
                ))}
              </button>
              <IconBtn
                label="Restart"
                onClick={() => {
                  filmRef.current?.seek(0);
                  filmRef.current?.play();
                }}
              >
                <RotateCcw className="size-4" />
              </IconBtn>
            </div>
          </footer>
        </div>
      )}

      {panel === "explore" && (
        <Sheet title="Try a number" kicker="Orbit" onClose={() => setPanel(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runExplore(query);
            }}
          >
            <label className="block text-xs text-muted" htmlFor="n">
              Positive integer
            </label>
            <input
              id="n"
              inputMode="numeric"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border bg-bg px-3 text-fg outline-none ring-primary focus:ring-1"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setQuery(String(n));
                    runExplore(String(n));
                  }}
                  className="h-11 rounded-md border border-border px-3 text-sm text-muted hover:text-primary"
                >
                  {n.toLocaleString("en-US")}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="mt-4 h-11 w-full rounded-md bg-primary text-sm font-semibold text-bg transition-[transform] duration-150 active:scale-[0.96]"
            >
              Run the rule
            </button>
          </form>
        </Sheet>
      )}

      {panel === "library" && (
        <Sheet title="Your orbits" kicker="Library" onClose={() => setPanel(null)}>
          <SignInGate
            fallback={
              <p className="text-sm text-muted">
                Sign in to save orbits across devices.{" "}
                <Link to="/login" className="text-primary">
                  Sign in
                </Link>
              </p>
            }
          >
            <LibraryBody
              onOpen={(n) => runExplore(n)}
              onShare={(n) => {
                setQuery(n);
                runExplore(n);
                setPanel("share");
              }}
            />
          </SignInGate>
        </Sheet>
      )}

      {panel === "share" && (
        <Sheet title="Publish a proof" kicker="Share" onClose={() => setPanel(null)}>
          <SignInGate
            fallback={
              <p className="text-sm text-muted">
                Sign in to publish under your name.{" "}
                <Link to="/login" className="text-primary">
                  Sign in
                </Link>
              </p>
            }
          >
            <label className="block text-xs text-muted" htmlFor="byline">
              Share as
            </label>
            <input
              id="byline"
              value={byline}
              onChange={(e) => {
                setByline(e.target.value);
                setShareState("idle");
              }}
              className="mt-2 h-11 w-full rounded-md border border-border bg-bg px-3 text-fg outline-none ring-primary focus:ring-1"
            />
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Viewers will see{" "}
              <span className="text-fg">a proof by {byline.trim() || DEFAULT_BYLINE}</span>
              {snap.explorerN != null
                ? ` · orbit of ${snap.explorerN.toLocaleString("en-US")}`
                : " · the film"}
              .
            </p>
            <button
              type="button"
              onClick={() => void onPublish()}
              disabled={shareState === "publishing"}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-bg transition-[transform] duration-150 active:scale-[0.96] disabled:opacity-60"
            >
              <Share2 className="size-4" />
              {shareState === "publishing" ? "Publishing…" : "Publish"}
            </button>
            {shareState === "error" && (
              <p className="mt-3 text-xs text-danger">Could not publish. Sign in and try again.</p>
            )}
            {shareUrl && (
              <div className="mt-4 space-y-2 rounded-md border border-border bg-bg p-3">
                <p className="text-xs text-muted">
                  Live as a proof by <span className="text-fg">{shareBy ?? byline}</span>
                </p>
                <p className="break-all text-xs text-primary">{shareUrl}</p>
                <button
                  type="button"
                  className="h-11 w-full rounded-md border border-border text-sm text-fg hover:bg-surface-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(shareUrl).then(
                      () => setCopied(true),
                      () => setCopied(false),
                    );
                  }}
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            )}
          </SignInGate>
        </Sheet>
      )}
    </main>
  );
}

function LibraryBody({
  onOpen,
  onShare,
}: {
  onOpen: (n: string) => void;
  onShare: (n: string) => void;
}) {
  const [orbits, setOrbits] = useState<OrbitRow[] | null>(null);
  const [shares, setShares] = useState<ShareRow[] | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([listMyOrbits(), listMyShares()])
      .then(([o, s]) => {
        if (!live) return;
        setOrbits(o);
        setShares(s);
      })
      .catch(() => {
        if (!live) return;
        setOrbits([]);
        setShares([]);
      });
    return () => {
      live = false;
    };
  }, []);
  if (!orbits || !shares) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs tracking-[0.22em] text-muted uppercase">Saved</p>
        {orbits.length === 0 ? (
          <p className="text-sm text-muted">No orbits yet. Run a number, then save.</p>
        ) : (
          <ul className="space-y-1">
            {orbits.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 rounded-md px-1 py-1">
                <button
                  type="button"
                  className="min-h-11 flex-1 text-left text-sm text-fg"
                  onClick={() => onOpen(o.start_n)}
                >
                  {Number(o.start_n).toLocaleString("en-US")}
                  <span className="ml-2 text-muted">{o.steps} steps</span>
                </button>
                <button
                  type="button"
                  className="h-11 px-2 text-xs text-primary"
                  onClick={() => onShare(o.start_n)}
                >
                  share
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {shares.length > 0 && (
        <div>
          <p className="mb-2 text-xs tracking-[0.22em] text-muted uppercase">Published</p>
          <ul className="space-y-1">
            {shares.map((s) => (
              <li key={s.slug}>
                <Link
                  to="/p/$slug"
                  params={{ slug: s.slug }}
                  className="flex min-h-11 items-center text-sm text-primary"
                >
                  {s.byline}
                  {s.start_n ? ` · ${Number(s.start_n).toLocaleString("en-US")}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Sheet({
  title,
  kicker,
  onClose,
  children,
}: {
  title: string;
  kicker: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.22em] text-muted uppercase">{kicker}</p>
            <h2 className="text-lg text-fg">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-md text-muted hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-surface/80 text-fg backdrop-blur-sm transition-[transform,background-color] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]"
    >
      {children}
    </button>
  );
}
