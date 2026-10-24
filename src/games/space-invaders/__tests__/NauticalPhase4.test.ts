import { drawNauticalChartBackdrop } from "../mods/nautical/rendering/NauticalChartBackground";
import { drawNauticalHud } from "../mods/nautical/rendering/NauticalHudOverlay";
import { createDefaultWindState } from "../mods/nautical/NauticalWindSystem";

function mockCtx() {
  const ops: string[] = [];
  const ctx = {
    save: () => ops.push("save"),
    restore: () => ops.push("restore"),
    fillRect: () => ops.push("fillRect"),
    strokeRect: () => ops.push("strokeRect"),
    beginPath: () => ops.push("beginPath"),
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    closePath: () => {},
    stroke: () => ops.push("stroke"),
    fill: () => ops.push("fill"),
    fillText: (t: string) => ops.push(`text:${t}`),
    translate: () => {},
    rotate: () => {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    lineCap: "butt",
    lineJoin: "miter",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
  } as unknown as CanvasRenderingContext2D;
  return { ctx, ops };
}

describe("Phase 4 — Nautical HUD + wind-aware backdrop", () => {
  it("draws Leguas, Viento, Tripulación labels", () => {
    const { ctx, ops } = mockCtx();
    const wind = createDefaultWindState();
    wind.force = 2;
    wind.sign = -1;
    drawNauticalHud(ctx, 800, 600, 1240, 3, wind);
    const texts = ops.filter((o) => o.startsWith("text:")).map((o) => o.slice(5));
    expect(texts).toContain("Leguas");
    expect(texts).toContain("Viento");
    expect(texts).toContain("Tripulación");
    expect(texts.some((t) => t.includes("N"))).toBe(true);
  });

  it("backdrop draws without wind and with wind", () => {
    const { ctx, ops } = mockCtx();
    drawNauticalChartBackdrop(ctx, 800, 600);
    expect(ops).toContain("fillRect");
    expect(ops.filter((o) => o === "stroke").length).toBeGreaterThan(5);

    const { ctx: ctx2, ops: ops2 } = mockCtx();
    const wind = createDefaultWindState();
    wind.force = 3;
    wind.sign = 1;
    drawNauticalChartBackdrop(ctx2, 800, 600, { wind });
    expect(ops2).toContain("fillRect");
  });
});
