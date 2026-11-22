// Preview tooling (needs Chromium via playwright-core):
//   bun src/capture.ts sheet [light|dark] [out.png]     contact sheet of every story beat
//   bun src/capture.ts frames t1,t2,... [theme] [dir]    individual frames
//   bun src/capture.ts video [light|dark] [out.mp4]      full-loop preview video (30 fps)
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { tmpdir } from "os";
import { DURATION, H, THEMES, W } from "./config";
import { BEATS } from "./choreography";
import { ASSETS } from "./build";
import { openSvg } from "./render/browser";

const PREVIEW = join(import.meta.dir, "..", "..", "preview");

async function frames(theme: "light" | "dark", times: number[], dir: string, scale = 1.5) {
  mkdirSync(dir, { recursive: true });
  const th = THEMES[theme];
  const b = await openSvg(join(ASSETS, `duel-${theme}.svg`), th.bg, W, H, scale);
  const out: string[] = [];
  for (const [i, t] of times.entries()) {
    const p = join(dir, `f${String(i).padStart(4, "0")}.png`);
    await b.shot(t, p);
    out.push(p);
  }
  await b.close();
  return out;
}

async function sheet(theme: "light" | "dark", outPng: string, beats = BEATS, cols = 4, o: { cellW?: number; y0?: number; y1?: number; x0?: number; x1?: number } = {}) {
  const dir = join(tmpdir(), `duel-sheet-${theme}-${process.pid}`);
  const cw = o.cellW ?? W / 2;
  const x0 = o.x0 ?? 0, x1 = o.x1 ?? W, y0 = o.y0 ?? 0, y1 = o.y1 ?? H;
  const k = cw / (x1 - x0);
  const files = await frames(theme, beats.map((b) => b[0]), dir, Math.max(1, Math.min(3, k * 1.5)));
  const th = THEMES[theme];
  const cell = (f: string, i: number) =>
    `<figure><div class="v"><img src="file://${f}"></div><figcaption>${beats[i][0].toFixed(2)}s · ${beats[i][1]}</figcaption></figure>`;
  const html = `<!doctype html><html><body style="margin:0;padding:16px;background:${theme === "dark" ? "#010409" : "#f6f8fa"};font:13px -apple-system,Helvetica,sans-serif;color:${th.muted}">
  <div style="display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:12px">${files.map(cell).join("")}</div>
  <style>figure{margin:0}.v{width:${cw}px;height:${(y1 - y0) * k}px;overflow:hidden;position:relative;background:${th.bg};border:1px solid ${theme === "dark" ? "#30363d" : "#d1d9e0"};border-radius:4px}
  img{position:absolute;left:${-x0 * k}px;top:${-y0 * k}px;width:${W * k}px;height:${H * k}px}figcaption{padding:4px 2px}</style></body></html>`;
  const htmlPath = join(dir, "sheet.html");
  writeFileSync(htmlPath, html);
  const { chromium } = await import("playwright-core");
  const br = await chromium.launch();
  const page = await br.newPage({ viewport: { width: cols * (cw + 12) + 20, height: 400 }, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath}`);
  await page.screenshot({ path: outPng, fullPage: true });
  await br.close();
  rmSync(dir, { recursive: true, force: true });
  console.log("wrote", outPng);
}

async function video(theme: "light" | "dark", outMp4: string, fps = 30) {
  const dir = join(tmpdir(), `duel-video-${theme}-${process.pid}`);
  rmSync(dir, { recursive: true, force: true });
  const n = Math.round(DURATION * fps);
  const times = Array.from({ length: n }, (_, i) => i / fps);
  await frames(theme, times, dir, 2);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(dir, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", outMp4], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg failed");
  console.log("wrote", outMp4, `(${readdirSync(dir).length} frames)`);
  rmSync(dir, { recursive: true, force: true });
}

if (import.meta.main) {
  const [cmd, a, b, c] = process.argv.slice(2);
  mkdirSync(PREVIEW, { recursive: true });
  if (cmd === "sheet") await sheet((a as "light") ?? "light", b ?? join(PREVIEW, `contact-sheet-${a ?? "light"}.png`));
  else if (cmd === "zoom") {
    // zoom t1,t2,.. theme out.png x0,y0,x1,y1 [cols] [cellW]
    const [x0, y0, x1, y1] = (c ?? "0,180,830,360").split(",").map(Number);
    const extra = process.argv.slice(6);
    const ts = a.split(",").map(Number);
    await sheet((b as "light") ?? "light", extra[0] ?? join(PREVIEW, "zoom.png"), ts.map((t) => [t, ""] as [number, string]), Number(extra[1] ?? 3), { x0, y0, x1, y1, cellW: Number(extra[2] ?? 520) });
  } else if (cmd === "frames") {
    const times = a.split(",").map(Number);
    const files = await frames((b as "light") ?? "light", times, c ?? join(PREVIEW, "frames"), 2);
    console.log(files.join("\n"));
  } else if (cmd === "video") await video((a as "light") ?? "light", b ?? join(PREVIEW, `duel-preview-${a ?? "light"}.mp4`));
  else {
    await sheet("light", join(PREVIEW, "contact-sheet-light.png"));
    await sheet("dark", join(PREVIEW, "contact-sheet-dark.png"));
    await video("light", join(PREVIEW, "duel-preview-light.mp4"));
    await video("dark", join(PREVIEW, "duel-preview-dark.mp4"));
  }
}
