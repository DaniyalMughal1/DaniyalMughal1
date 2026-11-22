// Loads the README's <picture> block exactly as written, inside a GitHub-like README column,
// and checks it the way a visitor sees it: as an <img>, playing in real time (no seeking).
//   bun src/embedtest.ts   -> ../preview/embed/*.png + a summary of which asset each case picked
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright-core";

const ROOT = join(import.meta.dir, "..", "..");
const OUT = join(ROOT, "preview", "embed");
mkdirSync(OUT, { recursive: true });

const readme = readFileSync(join(ROOT, "README.md"), "utf8");
const picture = readme.match(/<picture>[\s\S]*?<\/picture>/)![0].replace(/(srcset|src)="(assets\/[^"]+)"/g, (_, a, p) => `${a}="${encodeURI("file://" + join(ROOT, p))}"`);

const page = (bg: string, fg: string, width: number, pad = 32) => `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:${bg};color:${fg};font:14px -apple-system,Segoe UI,Helvetica,sans-serif">
<div style="max-width:${width}px;margin:24px auto;padding:0 16px;box-sizing:content-box">
<div style="border:1px solid ${bg === "#ffffff" ? "#d1d9e0" : "#3d444d"};border-radius:6px;padding:24px ${pad}px">
<div style="font-size:12px;opacity:.6;margin-bottom:16px">DaniyalMughal1 / README.md</div>
<article>${picture}</article></div></div></body></html>`;

const cases = [
  { name: "desktop-light", vw: 1280, vh: 760, scheme: "light", motion: "no-preference", col: 830 },
  { name: "desktop-dark", vw: 1280, vh: 760, scheme: "dark", motion: "no-preference", col: 830 },
  { name: "mobile-light", vw: 390, vh: 700, scheme: "light", motion: "no-preference", col: 358 },
  { name: "mobile-dark", vw: 390, vh: 700, scheme: "dark", motion: "no-preference", col: 358 },
  { name: "reduced-light", vw: 1280, vh: 760, scheme: "light", motion: "reduce", col: 830 },
  { name: "reduced-dark", vw: 390, vh: 700, scheme: "dark", motion: "reduce", col: 358 },
] as const;

const browser = await chromium.launch();
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: c.vw, height: c.vh }, deviceScaleFactor: 2, colorScheme: c.scheme, reducedMotion: c.motion });
  const p = await ctx.newPage();
  const dark = c.scheme === "dark";
  const html = join(OUT, `_${c.name}.html`);
  writeFileSync(html, page(dark ? "#0d1117" : "#ffffff", dark ? "#e6edf3" : "#1f2328", c.col, c.vw < 600 ? 16 : 32));
  await p.goto(encodeURI(`file://${html}`), { waitUntil: "load" });
  await p.waitForFunction(() => (document.querySelector("img") as HTMLImageElement).complete);
  const t0 = Date.now();
  const info = await p.evaluate(() => {
    const img = document.querySelector("img") as HTMLImageElement;
    return { src: img.currentSrc.split("/").pop(), w: img.clientWidth, h: img.clientHeight };
  });
  const shots: number[] = c.motion === "reduce" ? [1] : [2.3, 7.6, 19.4];
  for (const s of shots) {
    const wait = s * 1000 - (Date.now() - t0);
    if (wait > 0) await p.waitForTimeout(wait);
    await p.screenshot({ path: join(OUT, `${c.name}-${s}s.png`) });
  }
  console.log(`${c.name.padEnd(14)} picked ${info.src} at ${info.w}x${info.h}px`);
  await ctx.close();
}
await browser.close();
