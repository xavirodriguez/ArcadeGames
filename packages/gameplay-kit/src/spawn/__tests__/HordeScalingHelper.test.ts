import { generateScaledWave, HordeScalingConfig } from "../HordeScalingHelper";

describe("HordeScalingHelper Tests", () => {
  const baseConfig: HordeScalingConfig = {
    baseCount: 5,
    growthFactor: 1.5,
    maxCount: 20,
    baseSpawnInterval: 1.0,
    minSpawnInterval: 0.2,
    intervalDecayPerWave: 0.1,
    enemyBlueprints: ["enemy_runner", "enemy_charger"],
    cooldown: 4.0,
    bossWaveInterval: 3,
    bossBlueprintId: "boss_giant",
  };

  it("should generate scaled wave 1 (index 0) with base count and interval", () => {
    const wave = generateScaledWave(0, baseConfig);

    expect(wave.id).toBe("wave_1");
    expect(wave.isBossWave).toBe(false);
    expect(wave.cooldown).toBe(4.0);
    expect(wave.spawns.length).toBe(5); // baseCount 5
    expect(wave.spawns[0].blueprintId).toBe("enemy_runner");
    expect(wave.spawns[1].blueprintId).toBe("enemy_charger");
    expect(wave.spawns[1].delay).toBeCloseTo(1.0); // interval 1.0s
  });

  it("should scale enemy count exponentially and decay spawn intervals for wave 2 (index 1)", () => {
    const wave = generateScaledWave(1, baseConfig);

    expect(wave.id).toBe("wave_2");
    expect(wave.spawns.length).toBe(7); // floor(5 * 1.5^1) = 7
    expect(wave.spawns[1].delay).toBeCloseTo(0.9); // 1.0 - 0.1
  });

  it("should generate boss wave on interval 3 (index 2)", () => {
    const wave = generateScaledWave(2, baseConfig);

    expect(wave.id).toBe("wave_3");
    expect(wave.isBossWave).toBe(true);
    expect(wave.spawns.length).toBe(1);
    expect(wave.spawns[0].blueprintId).toBe("boss_giant");
  });

  it("should respect maxCount cap and minSpawnInterval floor for higher waves", () => {
    const wave = generateScaledWave(10, baseConfig); // Wave 11

    expect(wave.isBossWave).toBe(false);
    expect(wave.spawns.length).toBe(20); // Capped at maxCount 20
    expect(wave.spawns[1].delay).toBeCloseTo(0.2); // Floored at minSpawnInterval 0.2s
  });
});
