import { test } from "@playwright/test";

test("image load twice", async ({ page }) => {
  test.setTimeout(120000);
  page.on("console", (m) => console.log("T_LOG>>>" + m.text().slice(0, 300) + "<<<"));

  await page.goto("/hitandrun");
  await page.waitForFunction(
    () => typeof (window as any).__hitAndRunDebug?.getPlayerX === "function",
    undefined,
    { timeout: 90000 }
  );

  const result = await page.evaluate(async () => {
    const url = "/assets/?unstable_path=.%2Fsrc%2Fgames%2Fhitandrun%2Fassets%2Fthemes%2Fsumi-e%2Fcharacters/player.png";
    const loadOnce = (): Promise<string> =>
      new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => resolve("TIMEOUT"), 8000);
        img.onload = () => {
          clearTimeout(timer);
          resolve("LOADED " + img.naturalWidth + "x" + img.naturalHeight);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve("ERROR");
        };
        img.src = url;
      });
    const first = await loadOnce();
    const second = await loadOnce();
    return { first, second };
  });
  console.log("T_LOG>>>" + JSON.stringify(result) + "<<<");
});
