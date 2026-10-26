import {
  getColor,
  ink,
  stone,
  mountainCol,
  getDepth
} from "../colors/ProceduralPalettes";
import { drawProceduralPrimitivesCanvas } from "../rendering/drawProceduralSceneCanvas";
import type { ScenePrimitive } from "../types/ProceduralTypes";
import { Prng } from "../random/Prng";

describe("Procedural Colors & Render Adapters", () => {
  describe("ProceduralPalettes", () => {
    it("returns formatted rgba strings for ink and stone families", () => {
      const prng = new Prng(123);
      const inkColor = ink(0.8, 0.5, prng);
      expect(inkColor).toMatch(/^rgba\(\d+,\d+,\d+,0\.8\)$/);

      const stoneColor = stone(0.2, 1, prng);
      expect(stoneColor).toMatch(/^rgba\(\d+,\d+,\d+,1\)$/);
    });

    it("calculates depth and mountain shade deterministically", () => {
      const prng = new Prng(456);
      const depth = getDepth("mount", 500);
      expect(depth).toBeGreaterThanOrEqual(0);
      expect(depth).toBeLessThanOrEqual(1);

      const col1 = mountainCol(0.5, 500, depth, prng);
      const prng2 = new Prng(456);
      const col2 = mountainCol(0.5, 500, depth, prng2);
      expect(col1).toBe(col2);
    });
  });

  describe("Canvas2D Renderer", () => {
    it("draws all primitive types without throwing", () => {
      const mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        ellipse: jest.fn(),
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        globalAlpha: 1
      } as never as CanvasRenderingContext2D;

      const primitives: ScenePrimitive[] = [
        {
          type: "polygon",
          points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }],
          fill: "rgba(0,0,0,1)",
          stroke: "#000",
          strokeWidth: 2
        },
        {
          type: "polyline",
          points: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
          stroke: "#fff",
          strokeWidth: 1
        },
        {
          type: "ellipse",
          cx: 50,
          cy: 50,
          rx: 10,
          ry: 5,
          fill: "rgba(255,0,0,0.5)"
        },
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
          stroke: "#00f",
          strokeWidth: 3
        }
      ];

      expect(() => drawProceduralPrimitivesCanvas(mockCtx, primitives)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalledTimes(4);
      expect(mockCtx.restore).toHaveBeenCalledTimes(4);
    });
  });
});
