// Everything you are likely to want to change lives here.
import type { Dims } from "./rig/skeleton";

export const CONTENT = {
  greeting: "Hi, I'm Daniyal.",
  lines: ["Math / BBA @ Waterloo & Laurier", "Building Covalent.", "GTM Engineer @ Slashy (YC S25)"],
  /** typeset ' as ’ in the artwork (the alt text keeps the plain characters) */
  smartQuotes: true,
};

/** Loop length in seconds. Every beat in choreography.ts is placed in absolute seconds. */
export const DURATION = 27.5;
/** Frame used for the static fallback (reduced motion, no-SMIL clients) and as SVG base values. */
export const POSTER_T = 1.72;

export const W = 830;
export const H = 360;
export const FLOOR = 338;
export const CX = W / 2;
/** On narrow screens (the image itself under this width) the SVG zooms into this region. */
export const MOBILE = { maxWidth: 560, x0: 90, x1: 740, y0: 56 };

export const TYPE = {
  greeting: { font: "SourceSerif4Display-Regular.ttf", size: 62, baseline: 108, tracking: -0.6 },
  lines: { font: "Geist-Regular.woff", size: 21, baselines: [168, 200, 232], tracking: 0 },
};

export const HERO_DIMS: Dims = {
  headR: 8, neck: 2.4, spine1: 15, spine2: 15, upper: 14.5, fore: 14.5,
  thigh: 19.5, shin: 19.5, wand: 15, stroke: 3.6, shoulderAt: 0.86,
};
export const VILLAIN_DIMS: Dims = {
  headR: 8, neck: 2.6, spine1: 16.6, spine2: 16.6, upper: 15.6, fore: 15.6,
  thigh: 22, shin: 22, wand: 17, stroke: 3.5, shoulderAt: 0.86,
};

export type Theme = typeof THEMES.light;
export const THEMES = {
  light: {
    name: "light",
    bg: "#ffffff",
    fg: "#1f2328",
    muted: "#59636e",
    ink: "#1f2328",
    villain: "#1f2328",
    wand: "#5b3b22",
    villainWand: "#d8cfb8",
    villainWandEdge: "#6b6252",
    silhouette: "#0b0d10",
    bone: "#faf7ef",
    boneEdge: "#2b2a27",
    dust: "#8f8a80",
    debris: "#8c959f",
    scorch: "#1f2328",
    crack: "#8c959f",
    smoke: "#a3a9b0",
    red: { glow: "#ff3b30", body: "#d7141c", core: "#fff4ef" },
    green: { glow: "#1fe070", body: "#08b04a", core: "#f0fff4" },
    gold: { aura: "#ffcc1a", hair: "#ffc61a", edge: "#b88100", bright: "#fff3a6" },
    kame: { outer: "#1257ff", mid: "#1fc8ff", core: "#ffffff", glow: "#5fd0ff" },
    clash: { core: "#fffbe8", ring: "#ffd65a" },
    spark: "#ffb11a",
    flashOpacity: 0.55,
  },
  dark: {
    name: "dark",
    bg: "#0d1117",
    fg: "#e6edf3",
    muted: "#9198a1",
    ink: "#e6edf3",
    villain: "#e6edf3",
    wand: "#b07a4c",
    villainWand: "#e9e1cc",
    villainWandEdge: "#e9e1cc",
    silhouette: "#05070a",
    bone: "#f4f0e4",
    boneEdge: "#0d1117",
    dust: "#9c978d",
    debris: "#8b949e",
    scorch: "#000000",
    crack: "#6e7681",
    smoke: "#6e7681",
    red: { glow: "#ff453a", body: "#ff2d2d", core: "#fff4ef" },
    green: { glow: "#30ff88", body: "#19d660", core: "#f0fff4" },
    gold: { aura: "#ffdb3d", hair: "#ffd21f", edge: "#c78f00", bright: "#fff6c2" },
    kame: { outer: "#2a6bff", mid: "#36d6ff", core: "#ffffff", glow: "#2f7dff" },
    clash: { core: "#fffbe8", ring: "#ffd65a" },
    spark: "#ffc547",
    flashOpacity: 0.35,
  },
};
