// Dev: print joint positions at given times.  bun src/dev/probe.ts 2.0,2.1
import { THEMES } from "../config";
import { makeScene } from "../choreography";
const { H, V } = makeScene(THEMES.light);
const f = (p: number[]) => `(${p[0].toFixed(0)},${p[1].toFixed(0)})`;
for (const t of (process.argv[2] ?? "2").split(",").map(Number)) {
  const h = H.at(t), v = V.at(t);
  console.log(`t=${t}  H pel${f(h.pelvis)} head${f(h.head)} hand${f(h.handR)} tip${f(h.wandTip)} fR${f(h.footR)} fL${f(h.footL)}   V pel${f(v.pelvis)} head${f(v.head)} tip${f(v.wandTip)} fR${f(v.footR)} fL${f(v.footL)}`);
}
for (const t of (process.argv[3] ?? "").split(",").filter(Boolean).map(Number)) {
  console.log(t, "rot", H.rot.at(t).toFixed(1), "pivot", H.pivot.at(t).toFixed(2), "x", H.x.at(t).toFixed(1), "y", H.y.at(t).toFixed(1), "sy", H.sy.at(t).toFixed(2));
}
