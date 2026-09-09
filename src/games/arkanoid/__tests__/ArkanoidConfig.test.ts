import { ArkanoidConfigSchema, DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";

describe("ArkanoidConfigSchema", () => {
  it("should parse empty object into DEFAULT_ARKANOID_CONFIG successfully", () => {
    const result = ArkanoidConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(DEFAULT_ARKANOID_CONFIG);
      expect(result.data.SCREEN_WIDTH).toBe(800);
      expect(result.data.SCREEN_HEIGHT).toBe(600);
      expect(result.data.PADDLE_WIDTH).toBe(100);
      expect(result.data.BALL_SPEED_START).toBe(320);
      expect(result.data.PLAYER_INITIAL_LIVES).toBe(3);
    }
  });

  it("should accept valid overrides while preserving default fallback properties", () => {
    const override = {
      PADDLE_WIDTH: 150,
      BALL_SPEED_START: 400
    };
    const result = ArkanoidConfigSchema.safeParse(override);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PADDLE_WIDTH).toBe(150);
      expect(result.data.BALL_SPEED_START).toBe(400);
      expect(result.data.SCREEN_WIDTH).toBe(800);
    }
  });
});
