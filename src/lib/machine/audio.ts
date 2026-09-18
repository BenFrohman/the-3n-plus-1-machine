/** Procedural score: low drone + sparse ticks. Unlocks only on a user gesture. */

export class MachineAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: GainNode | null = null;
  private muted = false;
  private lastTick = 0;
  private oscs: OscillatorNode[] = [];

  get isMuted() {
    return this.muted;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC({ latencyHint: "interactive" });
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.22;
    master.connect(ctx.destination);
    this.master = master;

    const drone = ctx.createGain();
    drone.gain.value = 0;
    drone.connect(master);
    this.drone = drone;

    const make = (freq: number, type: OscillatorType, gain: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 420;
      o.connect(g);
      g.connect(f);
      f.connect(drone);
      o.start();
      this.oscs.push(o);
    };
    make(55, "sine", 0.45);
    make(55 * 1.01, "sine", 0.28);
    make(82.4, "triangle", 0.12);
    drone.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(m ? 0 : 0.22, this.ctx.currentTime, 0.04);
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  blip(kind: "even" | "odd" | "tick") {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    if (kind === "tick") {
      if (t - this.lastTick < 0.18) return;
      this.lastTick = t;
    }
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = kind === "odd" ? "triangle" : "sine";
    const f = kind === "odd" ? 186 : kind === "even" ? 312 : 248;
    o.frequency.value = f * (0.96 + Math.random() * 0.08);
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(this.master);
    const amp = kind === "tick" ? 0.04 : 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.start(t);
    o.stop(t + 0.16);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  dispose() {
    for (const o of this.oscs) {
      try {
        o.stop();
        o.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.oscs = [];
    void this.ctx?.close();
    this.ctx = null;
  }
}
