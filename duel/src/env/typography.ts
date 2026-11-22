// Lays out the introduction as individual glyph outlines, so every letter can be
// hit, knocked loose, carried and put back — and looks identical on every OS
// (SVG in an <img> cannot load web fonts).
import opentype from "opentype.js";
import { readFileSync } from "fs";
import { join } from "path";
import { CONTENT, CX, TYPE } from "../config";

export interface Glyph {
  id: number;
  line: number; // 0 = greeting
  index: number; // character index within the line
  char: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  baseline: number;
  role: "greeting" | "line";
}

const FONT_DIR = join(import.meta.dir, "..", "..", "fonts");
const loadFont = (file: string) => {
  const b = readFileSync(join(FONT_DIR, file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

const smart = (s: string) => (CONTENT.smartQuotes ? s.replace(/'/g, "’") : s);

function layoutLine(text: string, font: opentype.Font, size: number, baseline: number, tracking: number, line: number) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  // measure
  let width = 0;
  const adv: number[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    let a = glyphs[i].advanceWidth! * scale;
    if (i < glyphs.length - 1) a += font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale + tracking;
    adv.push(a);
    width += a;
  }
  let x = CX - width / 2;
  const out: Omit<Glyph, "id">[] = [];
  const chars = [...text];
  for (let i = 0; i < glyphs.length; i++) {
    const path = glyphs[i].getPath(x, baseline, size);
    const d = path.toPathData(1);
    if (d && chars[i] !== " ") {
      const bb = path.getBoundingBox();
      out.push({
        line,
        index: i,
        char: chars[i],
        d,
        x1: bb.x1,
        y1: bb.y1,
        x2: bb.x2,
        y2: bb.y2,
        cx: (bb.x1 + bb.x2) / 2,
        cy: (bb.y1 + bb.y2) / 2,
        w: bb.x2 - bb.x1,
        h: bb.y2 - bb.y1,
        baseline,
        role: line === 0 ? "greeting" : "line",
      });
    }
    x += adv[i];
  }
  return { glyphs: out, x0: CX - width / 2, x1: CX + width / 2, width };
}

export function layoutText() {
  const serif = loadFont(TYPE.greeting.font);
  const sans = loadFont(TYPE.lines.font);
  const lines = [
    layoutLine(smart(CONTENT.greeting), serif, TYPE.greeting.size, TYPE.greeting.baseline, TYPE.greeting.tracking, 0),
    ...CONTENT.lines.map((l, i) =>
      layoutLine(smart(l), sans, TYPE.lines.size, TYPE.lines.baselines[i], TYPE.lines.tracking, i + 1),
    ),
  ];
  let id = 0;
  const glyphs: Glyph[] = lines.flatMap((l) => l.glyphs.map((g) => ({ ...g, id: id++ })));
  return { glyphs, lines };
}

export type TextLayout = ReturnType<typeof layoutText>;

/** Find a glyph by line and the n-th occurrence of a character (or by word + offset). */
export function findGlyph(layout: TextLayout, line: number, char: string, nth = 0) {
  const c = layout.glyphs.filter((g) => g.line === line && g.char === char);
  if (!c[nth]) throw new Error(`no glyph '${char}' #${nth} on line ${line}`);
  return c[nth];
}
export function wordGlyphs(layout: TextLayout, line: number, word: string) {
  const text = smart(line === 0 ? CONTENT.greeting : CONTENT.lines[line - 1]);
  const at = text.indexOf(word);
  if (at < 0) throw new Error(`no word '${word}' on line ${line}`);
  return layout.glyphs.filter((g) => g.line === line && g.index >= at && g.index < at + word.length);
}
