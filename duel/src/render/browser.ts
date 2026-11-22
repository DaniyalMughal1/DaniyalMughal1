// Headless Chromium helpers: seek the real SMIL timeline and screenshot frames.
import { chromium, type Browser, type Page } from "playwright-core";
import { readFileSync } from "fs";

export async function openSvg(svgFile: string, bg: string, width: number, height: number, scale = 2) {
  const browser: Browser = await chromium.launch();
  const page: Page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  const svg = readFileSync(svgFile, "utf8");
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:${bg};overflow:hidden">${svg.replace(
      /<svg /,
      `<svg id="duel" style="display:block;width:${width}px;height:${height}px" `,
    )}</body></html>`,
  );
  await page.evaluate(() => {
    const s = document.getElementById("duel") as unknown as SVGSVGElement;
    s.pauseAnimations();
  });
  const seek = async (t: number) => {
    await page.evaluate((tt) => {
      const s = document.getElementById("duel") as unknown as SVGSVGElement;
      s.setCurrentTime(tt);
    }, t);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  };
  const shot = async (t: number, path: string) => {
    await seek(t);
    await page.screenshot({ path, type: "png" });
  };
  return { browser, page, seek, shot, close: () => browser.close() };
}
