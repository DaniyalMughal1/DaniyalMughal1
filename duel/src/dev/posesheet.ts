// Dev tool: draws every pose in the library on a grid so poses can be judged at a glance.
import { HERO_DIMS, THEMES, FLOOR } from "../config";
import { Fighter } from "../rig/fighter";
import { POSES, type PoseName } from "../rig/poses";
import { figureNode } from "../render/figure";
import { render } from "../core/svg";
import { openSvg } from "../render/browser";
import { writeFileSync } from "fs";

const names = Object.keys(POSES) as PoseName[];
const cols = 10, cw = 84, chh = 130;
const rows = Math.ceil(names.length / cols);
const W = cols * cw, H = rows * chh;
const th = THEMES.light;
let body = "";
names.forEach((nm, i) => {
  const cx = (i % cols) * cw + cw / 2, row = Math.floor(i / cols);
  const f = new Fighter(nm, HERO_DIMS, nm, cx, 1);
  const rotFor: Record<string, number> = { proneDown: 90, proneImpact: 70, pushUp: 58, hitFly: -30 };
  f.key(0, { rot: rotFor[nm] ?? 0, y: "G" }, undefined);
  const node = figureNode(f, { ink: th.ink, wand: { color: th.wand, width: 2.2 } });
  const svgFrag = render(node, { mode: "still", t: 0, T: 1 });
  body += `<g transform="translate(0 ${row * chh - FLOOR + chh - 22})">${svgFrag}<text x="${cx}" y="${FLOOR + 16}" font-size="9" text-anchor="middle" font-family="sans-serif" fill="#888">${nm}</text><line x1="${cx - 36}" x2="${cx + 36}" y1="${FLOOR}" y2="${FLOOR}" stroke="#ddd"/></g>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;
const out = process.argv[2] ?? "posesheet.svg";
writeFileSync(out, svg);
const b = await openSvg(out, "#fff", W, H, 2);
await b.shot(0, out.replace(/\.svg$/, ".png"));
await b.close();
console.log("wrote", out);
