import { ThemeRegistry } from "../theme/ThemeRegistry";

describe("HitRun ThemeRegistry catalogue", () => {
  test("creates a fresh theme instance for every request", () => {
    const first = ThemeRegistry.get("sumi-e");
    const second = ThemeRegistry.get("sumi-e");

    expect(first.id).toBe("sumi-e");
    expect(second.id).toBe("sumi-e");
    expect(first).not.toBe(second);

    first.dispose();
    second.dispose();
  });

  test("falls back to fantasy when an unknown theme id is requested", () => {
    const fallback = ThemeRegistry.get("non_existent_theme");

    expect(fallback.id).toBe("fantasy");
    fallback.dispose();
  });
});
