import { layoutText } from "../env/typography";
const L = layoutText();
for (const [i, l] of L.lines.entries()) {
  console.log(`line ${i}: x ${l.x0.toFixed(1)}..${l.x1.toFixed(1)} (w ${l.width.toFixed(1)})`);
  console.log("   " + l.glyphs.map((g) => `${g.char}@${g.cx.toFixed(0)},${g.y1.toFixed(0)}-${g.y2.toFixed(0)}`).join(" "));
}
