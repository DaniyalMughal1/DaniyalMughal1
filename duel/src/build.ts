// Builds the animated SVGs (light + dark) and the static fallbacks into ../assets.
//   bun src/build.ts            -> assets/duel-{light,dark}.svg + duel-still-{light,dark}.svg
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { CONTENT, DURATION, H, MOBILE, POSTER_T, THEMES, W, type Theme } from "./config";
import { makeScene } from "./choreography";
import { attr, render, translate, type Ctx, type Node } from "./core/svg";
import { BOLT_DEFS } from "./fx/spells";
import { LAYERS } from "./scene";

export const ASSETS = join(import.meta.dir, "..", "..", "assets");

export const ALT =
  `${CONTENT.greeting} ${CONTENT.lines.join(". ")}. ` +
  "Animated: two stick-figure wizards duel beneath the text with red and green spells. " +
  "The red wizard loses a beam clash and is knocked out, gets back up, turns Super Saiyan, " +
  "and blasts his rival with a giant blue Kamehameha that leaves a tiny skeleton, then dust. " +
  "He tries to fix a knocked-out letter, another one falls on his head, and he runs off as the page repairs itself.";

export function buildTheme(th: Theme, mode: "anim" | "still", posterT = POSTER_T) {
  const { sc, letters } = makeScene(th);

  // the README text, one glyph at a time
  for (const l of letters) {
    const halo = sc.halo && sc.halo.glyphs.includes(l.gl.id) ? sc.halo : undefined;
    const node = l.node(l.gl.line === 0 ? th.fg : th.muted);
    if (halo) {
      const path = (node.kids?.[0] ?? node) as Node;
      path.a = { ...path.a, stroke: th.bg, "stroke-linejoin": "round", "paint-order": "stroke" };
      path.ch = [
        ...(path.ch ?? []),
        attr("stroke-width", (t) => (t >= halo.t0 && t < halo.t1 ? 6 : 0), { discrete: true, fmt: (v) => String(v[0]) }),
      ];
    }
    sc.add("text", node);
  }

  // the hero through <use>, so he can duck behind the words for a moment
  let defsHero = "";
  const ctx: Ctx = { mode, t: posterT, T: DURATION, stats: { anims: 0, keys: 0 } };
  if (sc.heroUse) {
    const [b0, b1] = sc.heroUse.behind;
    defsHero = render({ ...sc.heroUse.node, a: { ...(sc.heroUse.node.a ?? {}), id: "hero" } }, ctx);
    const use = (vis: (t: number) => boolean): Node => ({ tag: "use", a: { href: "#hero", "xlink:href": "#hero" }, vis });
    sc.add("chars", use((t) => t < b0 || t >= b1));
    sc.add("behind", use((t) => t >= b0 && t < b1));
  }

  const layers = LAYERS.map((name) => {
    const nodes = sc.layers[name];
    if (!nodes.length) return "";
    return `<g data-layer="${name}">${nodes.map((n) => render(n, ctx)).join("")}</g>`;
  }).join("");

  const camera: Node = { tag: "g", ch: [translate((t) => sc.camera(t), { tol: 0.15 })], kids: [layers] };
  const body = `<g id="stage">${render(camera, ctx)}</g>`;
  // responsive: when the image is drawn narrow (phones), zoom into the central stage so the text stays readable
  const k = W / (MOBILE.x1 - MOBILE.x0);
  const style = `<style>@media (max-width:${MOBILE.maxWidth}px){#stage{transform:translate(${(-MOBILE.x0 * k).toFixed(1)}px,${(-MOBILE.y0 * k).toFixed(1)}px) scale(${k.toFixed(4)})}}</style>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">` +
    `<title id="t">${CONTENT.greeting.replace(/&/g, "&amp;")}</title><desc id="d">${ALT.replace(/&/g, "&amp;")}</desc>` +
    style +
    `<defs>${BOLT_DEFS(th)}${defsHero}</defs>` +
    body +
    `</svg>`;
  return { svg, stats: ctx.stats! };
}

if (import.meta.main) {
  mkdirSync(ASSETS, { recursive: true });
  for (const th of [THEMES.light, THEMES.dark]) {
    const t0 = performance.now();
    const anim = buildTheme(th, "anim");
    writeFileSync(join(ASSETS, `duel-${th.name}.svg`), anim.svg);
    const still = buildTheme(th, "still");
    writeFileSync(join(ASSETS, `duel-still-${th.name}.svg`), still.svg);
    console.log(
      `${th.name}: ${(anim.svg.length / 1024).toFixed(0)} KB animated (${anim.stats.anims} animations, ${anim.stats.keys} keys), ` +
        `${(still.svg.length / 1024).toFixed(0)} KB still, ${((performance.now() - t0) / 1000).toFixed(1)}s`,
    );
  }
}
