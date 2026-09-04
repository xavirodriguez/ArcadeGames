import { ConfigService } from "@tiny-aster/core";
import { PlatformerConfigSchema, DEFAULT_PLATFORMER_CONFIG } from "../../../src/games/platformer/types/PlatformerConfigSchema";
import { EchoRunnerConfigSchema, DEFAULT_ECHO_RUNNER_CONFIG } from "../../../src/games/echorunner/types/EchoRunnerConfigSchema";
import { FlappyBirdConfigSchema, DEFAULT_FLAPPY_BIRD_CONFIG } from "../../../src/games/flappybird/types/FlappyBirdConfigSchema";
import { SpaceInvadersConfigSchema, DEFAULT_SPACE_INVADERS_CONFIG } from "../../../src/games/space-invaders/types/SpaceInvadersConfigSchema";
import { AsteroidConfigSchema, DEFAULT_ASTEROID_CONFIG } from "../../../src/games/asteroids/types/AsteroidConfigSchema";
import { GeometryWarsConfigSchema, DEFAULT_GEOMETRYWARS_CONFIG } from "../../../src/games/geometrywars/config/GeometryWarsConfig";

describe("Game Config Schemas and ConfigService Integration", () => {
  describe("safeParse({}) default values verification", () => {
    it("PlatformerConfigSchema safeParse produces expected defaults", () => {
      const parsed = PlatformerConfigSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(DEFAULT_PLATFORMER_CONFIG);
        expect(parsed.data.SCREEN_WIDTH).toBe(800);
        expect(parsed.data.SCREEN_HEIGHT).toBe(600);
        expect(parsed.data.TILE_SIZE).toBe(40);
        expect(parsed.data.PLAYER_SPEED).toBe(200);
        expect(parsed.data.PLAYER_ACCEL).toBe(800);
        expect(parsed.data.PLAYER_DECEL).toBe(1200);
        expect(parsed.data.PLAYER_AIR_ACCEL).toBe(400);
        expect(parsed.data.PLAYER_AIR_DECEL).toBe(600);
        expect(parsed.data.PLAYER_JUMP_VEL).toBe(350);
        expect(parsed.data.PLAYER_MIN_JUMP_VEL).toBe(150);
        expect(parsed.data.RISE_GRAVITY).toBe(800);
        expect(parsed.data.FALL_GRAVITY).toBe(1200);
      }
    });

    it("EchoRunnerConfigSchema safeParse produces expected defaults", () => {
      const parsed = EchoRunnerConfigSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(DEFAULT_ECHO_RUNNER_CONFIG);
        expect(parsed.data.SCREEN_WIDTH).toBe(800);
        expect(parsed.data.TILE_SIZE).toBe(40);
        expect(parsed.data.PLAYER_SPEED).toBe(220);
        expect(parsed.data.PLAYER_ACCEL).toBe(900);
        expect(parsed.data.PLAYER_DECEL).toBe(1300);
        expect(parsed.data.PLAYER_AIR_ACCEL).toBe(450);
        expect(parsed.data.PLAYER_AIR_DECEL).toBe(700);
        expect(parsed.data.PLAYER_JUMP_VEL).toBe(370);
        expect(parsed.data.PLAYER_MIN_JUMP_VEL).toBe(160);
        expect(parsed.data.RISE_GRAVITY).toBe(850);
        expect(parsed.data.FALL_GRAVITY).toBe(1300);
        expect(parsed.data.APEX_THRESHOLD).toBe(50);
        expect(parsed.data.APEX_GRAVITY_MULTIPLIER).toBe(0.2);
        expect(parsed.data.COYOTE_TIME_MAX).toBe(0.15);
        expect(parsed.data.JUMP_BUFFER_MAX).toBe(0.1);
      }
    });

    it("FlappyBirdConfigSchema safeParse produces expected defaults", () => {
      const parsed = FlappyBirdConfigSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(DEFAULT_FLAPPY_BIRD_CONFIG);
        expect(parsed.data.SCREEN_WIDTH).toBe(400);
        expect(parsed.data.BIRD_X).toBe(100);
        expect(parsed.data.GRAVITY).toBe(800);
        expect(parsed.data.KEYS.FLAP).toBe("Space");
      }
    });

    it("SpaceInvadersConfigSchema safeParse produces expected defaults", () => {
      const parsed = SpaceInvadersConfigSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(DEFAULT_SPACE_INVADERS_CONFIG);
        expect(parsed.data.SCREEN_WIDTH).toBe(800);
        expect(parsed.data.PLAYER_SPEED).toBe(300);
        expect(parsed.data.INVADER_ROWS).toBe(5);
        expect(parsed.data.KEYS.LEFT).toBe("ArrowLeft");
      }
    });

    it("AsteroidConfigSchema safeParse produces expected defaults", () => {
      const parsed = AsteroidConfigSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(DEFAULT_ASTEROID_CONFIG);
        expect(parsed.data.SCREEN_WIDTH).toBe(800);
        expect(parsed.data.INITIAL_ASTEROID_COUNT).toBe(5);
        expect(parsed.data.SHIP_THRUST).toBe(150);
      }
    });

    it("GeometryWarsConfigSchema safeParse produces expected defaults", () => {
      const parsed = GeometryWarsConfigSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual(DEFAULT_GEOMETRYWARS_CONFIG);
        expect(parsed.data.WIDTH).toBe(800);
        expect(parsed.data.PLAYER_SPEED).toBe(220);
        expect(parsed.data.INITIAL_LIVES).toBe(3);
      }
    });
  });

  describe("ConfigService.load validation errors", () => {
    it("throws descriptive error when an invalid value is supplied", () => {
      expect(() => {
        ConfigService.load("platformer", PlatformerConfigSchema, {
          SCREEN_WIDTH: "eight_hundred"
        });
      }).toThrow(/Configuration validation failed for game "platformer"/);

      expect(() => {
        ConfigService.load("space-invaders", SpaceInvadersConfigSchema, {
          PLAYER_SPEED: "fast"
        });
      }).toThrow(/Configuration validation failed for game "space-invaders"/);

      expect(() => {
        ConfigService.load("flappybird", FlappyBirdConfigSchema, {
          KEYS: "invalid_keys_object"
        });
      }).toThrow(/Configuration validation failed for game "flappybird"/);
    });
  });
});
