import { test } from "@playwright/test";

/** Minimal shape of an expo-asset registry entry read by this diagnostic spec. */
interface ExpoAssetRegistryEntry {
  downloaded?: boolean;
  localUri?: string | null;
  uri?: string;
}

test("asset identity", async ({ page }) => {
  test.setTimeout(120000);
  page.on("console", (m) => console.log("T_LOG>>>" + m.text().slice(0, 400) + "<<<"));

  await page.goto("/hitandrun");
  await page.waitForFunction(
    () => typeof (window as any).__hitAndRunDebug?.getPlayerX === "function",
    undefined,
    { timeout: 90000 }
  );

  const result = await page.evaluate(async () => {
    const w = window as any;
    const AssetClass = (w.require ? w.require("expo-asset") : null)?.Asset;
    const out: Record<string, unknown> = {};
    if (!AssetClass) {
      return { error: "no expo-asset on window" };
    }
    out.byUriSize = AssetClass.byUri ? Object.keys(AssetClass.byUri).length : -1;
    out.byHashSize = AssetClass.byHash ? Object.keys(AssetClass.byHash).length : -1;
    out.keys = Object.keys(AssetClass.byUri ?? {}).slice(0, 5);
    const byUri: Record<string, ExpoAssetRegistryEntry> = AssetClass.byUri ?? {};
    const a = Object.values(byUri)[0];
    out.firstDownloaded = a?.downloaded;
    out.firstLocalUri = a?.localUri;
    out.firstUri = a?.uri;
    return out;
  });
  console.log("T_LOG>>>" + JSON.stringify(result) + "<<<");
});
