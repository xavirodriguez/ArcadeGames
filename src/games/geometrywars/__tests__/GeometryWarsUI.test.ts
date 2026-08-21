import { en } from "../../../locales/en";
import { es } from "../../../locales/es";

describe("Geometry Wars UX & Accessibility Tests", () => {
  it("exports required Geometry Wars translation keys in English locale", () => {
    expect(en.geometrywars).toBeDefined();
    expect(en.geometrywars.instructions_touch).toContain("Left touch area");
    expect(en.geometrywars.instructions_keyboard).toContain("WASD");
    expect(en.geometrywars.loading_ecs).toBe("Loading ECS simulation...");
    expect(en.geometrywars.lives).toBe("LIVES");
    expect(en.geometrywars.bombs).toBe("BOMBS");
    expect(en.geometrywars.score).toBe("SCORE");
    expect(en.geometrywars.high_score).toBe("HIGH SCORE");
    expect(en.geometrywars.wave).toBe("WAVE");
    expect(en.geometrywars.paused).toBe("PAUSED");
    expect(en.geometrywars.resume).toBe("RESUME");
    expect(en.geometrywars.final_score).toBe("Final Score");
    expect(en.geometrywars.new_record).toBe("NEW RECORD!");
    expect(en.geometrywars.restart).toBe("RESTART");

    expect(en.accessibility.gw_lives_label).toContain("{lives}");
    expect(en.accessibility.gw_score_label).toContain("{score}");
    expect(en.accessibility.gw_wave_label).toContain("{wave}");
  });

  it("exports required Geometry Wars translation keys in Spanish locale", () => {
    expect(es.geometrywars).toBeDefined();
    expect(es.geometrywars.instructions_touch).toContain("Área táctil izquierda");
    expect(es.geometrywars.instructions_keyboard).toContain("WASD");
    expect(es.geometrywars.loading_ecs).toBe("Cargando simulación ECS...");
    expect(es.geometrywars.lives).toBe("VIDAS");
    expect(es.geometrywars.bombs).toBe("BOMBAS");
    expect(es.geometrywars.score).toBe("PUNTAJE");
    expect(es.geometrywars.high_score).toBe("RÉCORD");
    expect(es.geometrywars.wave).toBe("OLEADA");
    expect(es.geometrywars.paused).toBe("PAUSADO");
    expect(es.geometrywars.resume).toBe("REANUDAR");
    expect(es.geometrywars.final_score).toBe("Puntaje Final");
    expect(es.geometrywars.new_record).toBe("¡NUEVO RÉCORD!");
    expect(es.geometrywars.restart).toBe("REINICIAR");

    expect(es.accessibility.gw_lives_label).toContain("{lives}");
    expect(es.accessibility.gw_score_label).toContain("{score}");
    expect(es.accessibility.gw_wave_label).toContain("{wave}");
  });

  it("formats HUD accessibility strings correctly", () => {
    const livesLabel = en.accessibility.gw_lives_label
      .replace("{lives}", "3")
      .replace("{bombs}", "2");
    expect(livesLabel).toBe("Lives remaining: 3, Bombs available: 2");

    const scoreLabel = en.accessibility.gw_score_label
      .replace("{score}", "1500")
      .replace("{highScore}", "5000");
    expect(scoreLabel).toBe("Current score: 1500, High score: 5000");

    const waveLabel = en.accessibility.gw_wave_label.replace("{wave}", "4");
    expect(waveLabel).toBe("Current wave: 4");
  });
});
