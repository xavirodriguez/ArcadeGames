import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Visual baseline for Out Run (roadmap T0.3).
 *
 * The suite drives the deterministic E2E control surface exposed by the Out Run
 * screen (`window.__outrunDebug`, only installed when `EXPO_PUBLIC_E2E_HOOKS=true`),
 * parks the camera on deterministic track positions and stores PNG frames under
 * `docs/outrun-baseline/`.
 */

const SEED = 20260101;
const BASELINE_DIR = path.resolve(__dirname, "..", "docs", "outrun-baseline");
/**
 * Tag used for the two lap-close captures. `before` documents the state prior
 * to the curvature parallax fix, `after` the state once the fix landed.
 */
const WRAP_TAG = process.env.OUTRUN_BASELINE_WRAP_TAG ?? "before";

interface CaptureTarget {
  /** File name (without extension) inside `docs/outrun-baseline/`. */
  name: string;
  /** Camera Z as a fraction of the generated track length. */
  progress: number;
}

async function waitForOutrunDebug(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof window.__outrunDebug?.getState === "function",
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

async function captureBuffer(page: import("@playwright/test").Page): Promise<Buffer> {
  await waitForRenderedFrames(page);
  return page.locator("canvas").first().screenshot();
}

async function capture(
  page: import("@playwright/test").Page,
  name: string
): Promise<Buffer> {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const buffer = await captureBuffer(page);
  fs.writeFileSync(path.join(BASELINE_DIR, `${name}.png`), buffer);
  return buffer;
}

test.describe("Out Run visual baseline", () => {
  test("captures the deterministic track scenarios", async ({ page }) => {
    test.setTimeout(180000);
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    page.on("console", (message) => {
      if (message.type() === "error") {
        console.log(`CONSOLE_ERROR>>>${message.text().slice(0, 300)}<<<`);
      }
    });

    await page.goto(`/outrun?seed=${SEED}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Loading CanvasKit...")).toBeHidden({ timeout: 30000 });
    await waitForOutrunDebug(page);
    await expect(page.locator("canvas").first()).toBeVisible();

    // Which backend painted the frame? The Out Run screen mounts the Canvas2D
    // renderer (`CanvasRenderer`), never the Skia one (`GameRenderer`), so the
    // canvas exposes a 2D context; a CanvasKit/Skia canvas would expose WebGL.
    const canvasBackend = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return "none";
      return canvas.getContext("2d") ? "canvas2d" : "webgl-or-other";
    });
    console.log(`OUTRUN_CANVAS_BACKEND>>>${canvasBackend}<<<`);
    expect(canvasBackend).toBe("canvas2d");

    // Freeze the simulation so every capture shows the same frozen world.
    // The capture must happen while the race is still in its countdown phase:
    // traffic does not move until the countdown ends, so the frozen world is
    // the deterministic spawn state of the seeded track.
    const prePauseState = await page.evaluate(() => window.__outrunDebug?.getState() ?? null);
    expect(prePauseState?.racePhase).toBe("countdown");

    await page.evaluate(() => window.__outrunDebug?.pause());
    await page.evaluate(() => window.__outrunDebug?.setRacePhase("racing"));
    await page.evaluate(() => window.__outrunDebug?.setSpeed(0));

    const state = await page.evaluate(() => window.__outrunDebug?.getState() ?? null);
    expect(state).not.toBeNull();
    expect(state?.seed).toBe(SEED);
    expect(state?.isPaused).toBe(true);
    expect(state?.trackLength).toBeGreaterThan(0);

    const track = await page.evaluate(() => window.__outrunDebug?.getTrackProfile() ?? []);
    expect(track.length).toBeGreaterThan(50);

    const trackLength = state!.trackLength;
    const segmentZ = (index: number): number => track[index]?.z ?? 0;

    // Straight: a flat segment without curvature.
    const straightIndex = track.findIndex(
      (entry) => entry.curve === 0 && entry.hill === 0 && entry.index > 5
    );
    expect(straightIndex).toBeGreaterThan(-1);

    // Strongest left / right curvature of the generated track.
    let leftIndex = 0;
    let rightIndex = 0;
    for (const entry of track) {
      if (entry.curve < track[leftIndex]!.curve) leftIndex = entry.index;
      if (entry.curve > track[rightIndex]!.curve) rightIndex = entry.index;
    }
    expect(track[leftIndex]!.curve).toBeLessThan(0);
    expect(track[rightIndex]!.curve).toBeGreaterThan(0);

    // Crest: the first segment where the elevation derivative flips from up to down.
    let crestIndex = -1;
    for (let i = 1; i < track.length; i++) {
      if (track[i - 1]!.hill > 0 && track[i]!.hill < 0) {
        crestIndex = i;
        break;
      }
    }
    expect(crestIndex).toBeGreaterThan(0);

    // Descent: the middle of the longest descending stretch.
    let descentIndex = -1;
    let descentRun = 0;
    let bestRun = 0;
    for (const entry of track) {
      if (entry.hill < 0) {
        descentRun += 1;
        if (descentRun > bestRun) {
          bestRun = descentRun;
          descentIndex = entry.index;
        }
      } else {
        descentRun = 0;
      }
    }
    expect(descentIndex).toBeGreaterThan(-1);

    const targets: CaptureTarget[] = [
      { name: "straight", progress: segmentZ(straightIndex) / trackLength },
      { name: "curve-left", progress: segmentZ(leftIndex) / trackLength },
      { name: "curve-right", progress: segmentZ(rightIndex) / trackLength },
      { name: "crest", progress: segmentZ(crestIndex) / trackLength },
      { name: "descent", progress: segmentZ(descentIndex) / trackLength },
      // Scenario changes follow the visual stage script (coast → desert → sierra).
      { name: "scenario-coast", progress: 0.25 },
      { name: "scenario-desert", progress: 0.55 },
      { name: "scenario-mountain", progress: 0.7 },
      // Both sides of the lap close (see docs/outrun-baseline/README.md).
      { name: `${WRAP_TAG}-wrap-end`, progress: (trackLength - 1) / trackLength },
      { name: `${WRAP_TAG}-wrap-start`, progress: 0 }
    ];

    for (const target of targets) {
      const z = Math.round(target.progress * trackLength);
      await page.evaluate((nextZ) => {
        window.__outrunDebug?.setPlayerZ(nextZ);
        window.__outrunDebug?.setPlayerX(0);
        window.__outrunDebug?.setSpeed(0);
      }, z);
      console.log(`CAPTURE>>>${target.name}>>>playerZ=${z}>>>trackLength=${trackLength}`);
      await capture(page, target.name);
    }

    // The frozen world must render identically twice, otherwise the stored
    // baseline cannot be compared across commits.
    const firstPass = await captureBuffer(page);
    const secondPass = await captureBuffer(page);
    expect(secondPass.equals(firstPass)).toBe(true);

    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test("rebuilds the deterministic track when the seed changes", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto(`/outrun?seed=${SEED}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Loading CanvasKit...")).toBeHidden({ timeout: 30000 });
    await waitForOutrunDebug(page);

    const before = await page.evaluate(() => window.__outrunDebug?.getState() ?? null);
    expect(before?.seed).toBe(SEED);

    await page.evaluate(() => window.__outrunDebug?.setSeed(4242));
    await page.waitForFunction(
      () => window.__outrunDebug?.getState().seed === 4242,
      undefined,
      { timeout: 30000 }
    );

    const after = await page.evaluate(() => window.__outrunDebug?.getState() ?? null);
    expect(after?.seed).toBe(4242);
    expect(after?.trackLength).not.toBe(before?.trackLength);
  });
});
