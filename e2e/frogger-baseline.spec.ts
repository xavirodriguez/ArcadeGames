import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SEED = 12345;
const CAPTURE_DIR = path.resolve(__dirname, "..", "docs", "frogger", "captures");

interface ViewportSpec {
  width: number;
  height: number;
}

const VIEWPORTS: ViewportSpec[] = [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 1280, height: 720 },
];

async function waitForFroggerDebug(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as any).__froggerDebug?.applyFixture === "function",
    undefined,
    { timeout: 30000 }
  );
}

async function waitForRenderedFrames(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

test.describe("Frogger visual baseline", () => {
  for (const viewport of VIEWPORTS) {
    test(`captures ${viewport.width}x${viewport.height}`, async ({ page }) => {
      test.setTimeout(180000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const pageErrors: Error[] = [];
      page.on("pageerror", (error) => pageErrors.push(error));

      await page.goto(`/frogger?seed=${SEED}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30000 });
      await waitForFroggerDebug(page);

      await page.evaluate(() => (window as any).__froggerDebug.applyFixture());
      await page.evaluate(() => (window as any).__froggerDebug.pause());

      await waitForRenderedFrames(page);

      fs.mkdirSync(CAPTURE_DIR, { recursive: true });
      const fileName = `before-${viewport.width}x${viewport.height}.png`;
      await page.locator("canvas").first().screenshot({
        path: path.join(CAPTURE_DIR, fileName),
      });

      // Measure overlap between HUD/controls and the canvas logical rows 1-11.
      const metrics = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return null;
        const canvasRect = canvas.getBoundingClientRect();
        const rowHeight = canvasRect.height / 15;
        const bandTop = canvasRect.top + rowHeight * 1;
        const bandBottom = canvasRect.top + rowHeight * 12;

        const hud = document.querySelector('[data-testid="frogger-hud"]') as HTMLElement | null;

        const collect = (el: HTMLElement | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
        };

        const hudRect = collect(hud);

        // Measure the actual touch-control buttons, not their full-screen gesture layer.
        const controlButtons = Array.from(document.querySelectorAll("*")).filter((el) =>
          ["▲", "▼", "◀", "▶"].includes((el.textContent || "").trim()) && (el as HTMLElement).children.length === 0
        );
        const controlRects = controlButtons.map((button) => collect(button as HTMLElement)).filter(Boolean);
        const controlsRect =
          controlRects.length > 0
            ? {
                top: Math.min(...controlRects.map((rect) => rect!.top)),
                bottom: Math.max(...controlRects.map((rect) => rect!.bottom)),
                left: Math.min(...controlRects.map((rect) => rect!.left)),
                right: Math.max(...controlRects.map((rect) => rect!.right)),
                width: 0,
                height: 0,
              }
            : null;

        const overlapsBand = (rect: { top: number; bottom: number } | null) => {
          if (!rect) return false;
          return rect.bottom > bandTop && rect.top < bandBottom;
        };

        return {
          canvasRect: { top: canvasRect.top, bottom: canvasRect.bottom, left: canvasRect.left, right: canvasRect.right, width: canvasRect.width, height: canvasRect.height },
          rowHeight,
          bandTop,
          bandBottom,
          hudRect,
          controlsRect,
          hudOverlaps: overlapsBand(hudRect),
          controlsOverlaps: overlapsBand(controlsRect),
        };
      });

      console.log(`FROGGER_BASELINE_METRICS_${viewport.width}x${viewport.height}>>>${JSON.stringify(metrics)}<<<`);

      expect(pageErrors).toEqual([]);
      expect(metrics).not.toBeNull();
      if (metrics) {
        expect(metrics.hudOverlaps).toBe(false);
        expect(metrics.controlsOverlaps).toBe(false);
      }
    });
  }
});