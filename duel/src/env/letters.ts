// Per-letter animation: knocks, wobbles, shakes, physical falls, being carried, restoring.
// A letter's state is an offset from its typeset position: [dx, dy, rotation°].
import { FLOOR } from "../config";
import { E, lerp, noise, ring, type Ease } from "../core/math";
import { g, n1, rotateCh, translate, type Node } from "../core/svg";
import type { Glyph } from "./typography";

export type Off = [number, number, number];
interface Seg {
  t0: number;
  f: (t: number) => Off;
}
interface Layer {
  t0: number;
  t1: number;
  f: (t: number) => Off;
  /** jitter layers are emitted "on twos" (15 fps, stepped) on their own group */
  jitter?: boolean;
}

const GRAV = 1900;

export class Letter {
  segs: Seg[] = [{ t0: -1e9, f: () => [0, 0, 0] }];
  layers: Layer[] = [];
  touched = false;
  constructor(public gl: Glyph) {}

  base(t: number): Off {
    let s = this.segs[0];
    for (const q of this.segs) if (q.t0 <= t) s = q;
    return s.f(t);
  }
  at(t: number, withJitter = true): Off {
    const b = this.base(t);
    for (const l of this.layers) {
      if (t < l.t0 || t > l.t1) continue;
      if (l.jitter && !withJitter) continue;
      const o = l.f(t);
      b[0] += o[0];
      b[1] += o[1];
      b[2] += o[2];
    }
    return b;
  }
  /** world centre of the letter at t */
  center(t: number): [number, number] {
    const o = this.at(t);
    return [this.gl.cx + o[0], this.gl.cy + o[1]];
  }
  private push(t0: number, f: (t: number) => Off) {
    this.touched = true;
    this.segs.push({ t0, f });
    this.segs.sort((a, b) => a.t0 - b.t0);
    return this;
  }
  layer(t0: number, t1: number, f: (t: number) => Off, jitter = false) {
    this.touched = true;
    this.layers.push({ t0, t1, f, jitter });
    return this;
  }
  jitterAt(t: number): [number, number] {
    let x = 0, y = 0;
    for (const l of this.layers) {
      if (!l.jitter || t < l.t0 || t > l.t1) continue;
      const o = l.f(t);
      x += o[0];
      y += o[1];
    }
    return [x, y];
  }

  /** Tween to an absolute offset. */
  moveTo(t: number, dur: number, to: Off, e: Ease = E.io) {
    const from = this.base(t);
    return this.push(t, (tt) => {
      const u = e(Math.min(1, Math.max(0, (tt - t) / dur)));
      return [lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u)];
    });
  }
  /** Hit: snap by (dx, dy, rot) with a springy overshoot, settling at `keep` of the displacement. */
  knock(t: number, dx: number, dy: number, rot: number, o: { dur?: number; freq?: number; keep?: number } = {}) {
    const from = this.base(t);
    const dur = o.dur ?? 0.7, freq = o.freq ?? 3.2, keep = o.keep ?? 0.25;
    return this.push(t, (tt) => {
      const dt = tt - t;
      const hit = Math.min(1, dt / 0.05);
      const env = dt < 0.05 ? E.outQ(hit) : keep + (1 - keep) * ring(dt - 0.05, freq, dur);
      return [from[0] + dx * env, from[1] + dy * env, from[2] + rot * env];
    });
  }
  /** Additive decaying rotation (and a little bounce). */
  wobble(t: number, amp: number, dur = 0.8, freq = 4) {
    return this.layer(t, t + dur * 1.6, (tt) => {
      const r = ring(tt - t, freq, dur);
      return [0, -Math.abs(r) * amp * 0.12, r * amp];
    });
  }
  shake(t0: number, t1: number, amp: number, freq = 18, ramp = 0.15) {
    const s = this.gl.id * 7.13;
    return this.layer(t0, t1, (tt) => {
      const env = Math.min(1, (tt - t0) / ramp, (t1 - tt) / ramp);
      return [noise(tt * freq, s) * amp * env, noise(tt * freq, s + 3) * amp * 0.8 * env, 0];
    }, true);
  }
  /** Lift on energy, hover, drop back. */
  levitate(t0: number, t1: number, height: number, spin: number) {
    return this.layer(t0, t1, (tt) => {
      const u = (tt - t0) / (t1 - t0);
      const up = u < 0.8 ? E.outQ(u / 0.8) : 1 - E.inQ((u - 0.8) / 0.2);
      const settle = u > 0.8 ? ring((u - 0.8) * (t1 - t0), 6, 0.25) * 0 : 0;
      return [noise(tt * 3, this.gl.id) * 2 * up, -height * up + settle, Math.sin(tt * 5) * spin * up];
    });
  }

  halfExtentY(rot: number) {
    const r = (rot * Math.PI) / 180;
    return Math.abs((this.gl.w / 2) * Math.sin(r)) + Math.abs((this.gl.h / 2) * Math.cos(r));
  }

  /** Ballistic fall to the floor with bounces; the letter then lies where it landed. */
  fall(t: number, vx: number, vy: number, spin: number, o: { floor?: number; rest?: number; bounce?: number } = {}) {
    const floor = o.floor ?? FLOOR;
    const start = this.base(t);
    let x = this.gl.cx + start[0], y = this.gl.cy + start[1], r = start[2];
    let dt = 1 / 240, time = 0;
    const samples: Off[] = [];
    let resting = false, restRot = o.rest ?? NaN, restT = 0;
    let bounces = 0;
    const restRotFrom = (rr: number) => Math.round(rr / 90) * 90;
    while (time < 4) {
      samples.push([x - this.gl.cx, y - this.gl.cy, r]);
      if (resting) {
        const u = Math.min(1, (time - restT) / 0.18);
        const rr = lerp(r, restRot, E.outQ(u));
        samples[samples.length - 1] = [x - this.gl.cx, floor - this.halfExtentY(rr) - this.gl.cy, rr];
        if (u >= 1) break;
        time += dt;
        continue;
      }
      vy += GRAV * dt;
      x += vx * dt;
      y += vy * dt;
      r += spin * dt;
      const bottom = y + this.halfExtentY(r);
      if (bottom >= floor && vy > 0) {
        y = floor - this.halfExtentY(r);
        bounces++;
        if (Number.isNaN(restRot)) restRot = restRotFrom(r);
        if (Math.abs(vy) < 160 || bounces > (o.bounce ?? 2)) {
          resting = true;
          restT = time;
        } else {
          vy = -vy * 0.3;
          vx *= 0.55;
          spin *= 0.45;
        }
      }
      time += dt;
    }
    const last = samples[samples.length - 1];
    this.restAfterFall = [last[0], last[1], last[2]];
    return this.push(t, (tt) => {
      const i = (tt - t) / dt;
      if (i >= samples.length - 1) return [...last] as Off;
      const k = Math.floor(i), f = i - k;
      const a = samples[k], b = samples[k + 1];
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
    });
  }
  restAfterFall: Off = [0, 0, 0];

  /** Follow a world-space path (e.g. a hand): `f` returns the letter centre and rotation. */
  carry(t0: number, f: (t: number) => [number, number, number]) {
    return this.push(t0, (tt) => {
      const [x, y, r] = f(tt);
      return [x - this.gl.cx, y - this.gl.cy, r];
    });
  }
  restore(t: number, dur = 0.6, e: Ease = E.outBackSoft) {
    return this.moveTo(t, dur, [0, 0, 0], e);
  }

  node(fill: string): Node {
    const gl = this.gl;
    if (!this.touched) return { tag: "path", a: { d: gl.d, fill } };
    const hasJitter = this.layers.some((l) => l.jitter);
    const path: Node = {
      tag: "path",
      a: { d: gl.d },
      ch: [rotateCh((t) => this.at(t, false)[2], { fmt: (v) => `${n1(v[0])} ${n1(gl.cx)} ${n1(gl.cy)}`, tol: 0.9, fps: 30 })],
    };
    const inner = hasJitter ? g([path], {}, [translate((t) => this.jitterAt(t), { discrete: true, fps: 15 })]) : path;
    return g([inner], { fill }, [
      translate((t) => {
        const o = this.at(t, false);
        return [o[0], o[1]];
      }, { tol: 0.35, fps: 30 }),
    ]);
  }
}
