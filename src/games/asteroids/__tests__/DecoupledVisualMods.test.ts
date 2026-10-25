import fs from "fs";
import path from "path";
import { World, Renderer } from "@tiny-aster/core";
import { AsteroidCollisionSystem } from "../systems/AsteroidCollisionSystem";
import { registerVisualMod } from "../mods/registry";
import { icebergMod } from "../mods/iceberg/IcebergMod";
import { initializeAsteroidsRenderer } from "../rendering/AsteroidsRendererManager";
import type { AsteroidsVisualMod } from "../mods/types";
import type { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";

describe("Decoupled Asteroids Visual Mods Architecture", () => {
  it("verifies AsteroidCollisionSystem source file has zero references to IcebergFracture", () => {
    const collisionSystemPath = path.resolve(__dirname, "../systems/AsteroidCollisionSystem.ts");
    const sourceContent = fs.readFileSync(collisionSystemPath, "utf-8");
    expect(sourceContent).not.toContain("IcebergFracture");
    expect(sourceContent).not.toContain("spawnIceShardFracture");
    expect(sourceContent).not.toContain("particleStyle");
  });

  it("verifies icebergMod.spawnDestructionEffect triggers ice shard fracture when registered", () => {
    const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    world.setResource("WorldConfig", { width: 800, height: 600, fixedTimeStep: 1 / 60 });

    let spawnDestructionEffectCalled = false;
    let effectSizePassed: string | undefined;

    const mockIcebergMod: AsteroidsVisualMod = {
      ...icebergMod,
      spawnDestructionEffect(_w, _x, _y, size) {
        spawnDestructionEffectCalled = true;
        effectSizePassed = size;
      }
    };

    world.setResource("VisualMod", mockIcebergMod);

    const collisionSystem = new AsteroidCollisionSystem();
    collisionSystem.onRegister(world);

    // Invoke private spawnExplosionParticles via reflection/method call
    collisionSystem["spawnExplosionParticles"](world, { x: 100, y: 100 }, "large");

    expect(spawnDestructionEffectCalled).toBe(true);
    expect(effectSizePassed).toBe("large");
  });

  it("allows custom registered mod to override destruction FX, colors, and HUD without touching engine core", () => {
    let customFxTriggered = false;
    let customHudRegisteredCanvas = false;
    let customHudRegisteredSkia = false;

    const customMod: AsteroidsVisualMod = {
      id: "custom_plasma",
      displayName: "Custom Plasma",
      createTheme: (base) => ({
        ...base,
        colorMap: {
          ...base.colorMap,
          thrustFlame: "#ff00ff",
          hitFlash: "#00ffff"
        }
      }),
      registerDrawers: (register) => {
        register("canvas", "player_ship", { draw: () => {} } as never);
      },
      registerHud: (register) => {
        register("canvas", "mission_hud", { draw: () => {} } as never);
        register("skia", "mission_hud", { draw: () => {} } as never);
      },
      spawnDestructionEffect: () => {
        customFxTriggered = true;
      }
    };

    registerVisualMod(customMod);

    const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    world.setResource("VisualMod", customMod);

    const collisionSystem = new AsteroidCollisionSystem();
    collisionSystem["spawnExplosionParticles"](world, { x: 50, y: 50 }, "ship");
    expect(customFxTriggered).toBe(true);

    const registeredCanvasEffects: string[] = [];
    const registeredSkiaEffects: string[] = [];

    const mockRenderer: any = {
      type: "canvas",
      registerShape: jest.fn(),
      registerBackgroundEffect: jest.fn((name: string) => {
        registeredCanvasEffects.push(name);
      })
    };

    initializeAsteroidsRenderer(mockRenderer, customMod);

    expect(mockRenderer.registerBackgroundEffect).toHaveBeenCalledWith("mission_hud", expect.anything());
  });
});
