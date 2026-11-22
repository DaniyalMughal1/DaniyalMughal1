// The stage: named z-ordered layers, a camera-shake schedule, and shared lookups.
import { noise } from "./core/math";
import type { Node } from "./core/svg";
import type { Theme } from "./config";

export const LAYERS = [
  "floor", // cracks, scorch marks and dust on the floor
  "behind", // characters while they are hidden behind words
  "text", // the README itself
  "textfx", // scorch marks on letters
  "back", // beams and auras that sit behind the fighters
  "chars", // fighters, props, skeleton
  "fx", // spells, sparks, debris, dust
  "top", // flashes
] as const;
export type LayerName = (typeof LAYERS)[number];

interface Shake {
  t0: number;
  t1: number;
  amp: number;
  freq: number;
  decay: boolean;
}

export class Scene {
  layers = Object.fromEntries(LAYERS.map((l) => [l, [] as Node[]])) as Record<LayerName, Node[]>;
  shakes: Shake[] = [];
  /** the hero is drawn through <use> so he can slip behind the text for a moment */
  heroUse?: { node: Node; behind: [number, number] };
  /** knock-out halo on glyphs while something hides behind them */
  halo?: { glyphs: number[]; t0: number; t1: number };
  constructor(public th: Theme) {}
  add(layer: LayerName, ...nodes: (Node | null | undefined)[]) {
    for (const n of nodes) if (n) this.layers[layer].push(n);
  }
  /** Camera shake. decay=true: a sharp jolt that dies away; false: a steady rumble with soft ends. */
  shake(t0: number, t1: number, amp: number, freq = 22, decay = true) {
    this.shakes.push({ t0, t1, amp, freq, decay });
  }
  camera(t: number): [number, number] {
    let x = 0, y = 0;
    for (const s of this.shakes) {
      if (t < s.t0 || t > s.t1) continue;
      const u = (t - s.t0) / (s.t1 - s.t0);
      const env = s.decay ? (1 - u) ** 2 : Math.min(1, u * 6, (1 - u) * 6);
      x += noise(t * s.freq, s.t0 * 13) * s.amp * env;
      y += noise(t * s.freq, s.t0 * 13 + 5) * s.amp * 0.75 * env;
    }
    return [x, y];
  }
}
