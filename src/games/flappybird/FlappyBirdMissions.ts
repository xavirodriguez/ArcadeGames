import { World, ComboComponent } from "@tiny-aster/core";
import { MissionDefinition, ActiveMissionState } from "../shared/missions/MissionTypes";
import { FlappyBirdState, BirdComponent } from "./types/FlappyBirdTypes";

/**
 * Registry of the Flappy Bird mini-missions.
 * @public
 */
export const FLAPPY_BIRD_MINI_MISSIONS: MissionDefinition[] = [
  {
    id: "racha_near_miss",
    titleKey: "missions.flappy_racha_near_miss.title",
    descriptionKey: "missions.flappy_racha_near_miss.description",
    title: "Racha de Near Miss",
    description: "Realiza 3 roces cercanos (Near Miss) con las tuberías.",
    conditionType: "event_count",
    targetCount: 3,
    eventKeys: ["flappy:near_miss"],
    reward: { scoreBonus: 500 },
    onEvent: (_world, state) => {
      state.currentCount++;
      if (state.currentCount >= 3) {
        state.completed = true;
      }
    }
  },
  {
    id: "vuelo_puro",
    titleKey: "missions.flappy_vuelo_puro.title",
    descriptionKey: "missions.flappy_vuelo_puro.description",
    title: "Vuelo Puro",
    description: "Supera 10 tuberías sin activar el planeo (glide).",
    conditionType: "event_count",
    targetCount: 10,
    eventKeys: ["pipe:passed"],
    reward: { scoreBonus: 750, mutatorId: "speed_run" },
    onInit: (_world, state) => {
      state.customData = { failedGlide: false };
    },
    onEvent: (_world, state) => {
      if (state.customData.failedGlide) return;

      state.currentCount++;
      if (state.currentCount >= 10) {
        state.completed = true;
      }
    },
    onUpdate: (world, state) => {
      const birds = world.query("Bird");
      if (birds.length > 0) {
        const b = world.getComponent(birds[0], "Bird") as BirdComponent | undefined;
        if (b && b.isGliding) {
          state.customData.failedGlide = true;
          state.failed = true;
        }
      }
    }
  },
  {
    id: "maestro_combo",
    titleKey: "missions.flappy_maestro_combo.title",
    descriptionKey: "missions.flappy_maestro_combo.description",
    title: "Maestro del Combo",
    description: "Alcanza un multiplicador de combo x4.",
    conditionType: "state_threshold",
    targetCount: 4,
    reward: { scoreBonus: 800 },
    onUpdate: (world, state) => {
      const combos = world.query("Combo");
      if (combos.length > 0) {
        const c = world.getComponent(combos[0], "Combo") as ComboComponent | undefined;
        if (c) {
          state.currentCount = c.multiplier;
          if (c.multiplier >= 4) {
            state.completed = true;
          }
        }
      }
    }
  },
  {
    id: "superviviente_sector",
    titleKey: "missions.flappy_superviviente_sector.title",
    descriptionKey: "missions.flappy_superviviente_sector.description",
    title: "Superviviente de Tormenta",
    description: "Sobrevive a 1 evento ambiental de sector completo.",
    conditionType: "event_count",
    targetCount: 1,
    eventKeys: ["flappy:sector_event_ended"],
    reward: { scoreBonus: 1000 },
    onEvent: (_world, state) => {
      state.currentCount = 1;
      state.completed = true;
    }
  },
  {
    id: "cazador_laser",
    titleKey: "missions.flappy_cazador_laser.title",
    descriptionKey: "missions.flappy_cazador_laser.description",
    title: "Cazador de Compuertas",
    description: "Cruza exitosamente 3 compuertas láser.",
    conditionType: "event_count",
    targetCount: 3,
    eventKeys: ["pipe:passed"],
    reward: { scoreBonus: 850 },
    onEvent: (_world, state, _eventName, payload) => {
      if (payload && (payload as { movementType?: string }).movementType === "laser_gate") {
        state.currentCount++;
        if (state.currentCount >= 3) {
          state.completed = true;
        }
      }
    }
  },
  {
    id: "precision_estrecha",
    titleKey: "missions.flappy_precision_estrecha.title",
    descriptionKey: "missions.flappy_precision_estrecha.description",
    title: "Brecha Estrecha",
    description: "Atraviesa 2 tuberías con espacio estrecho.",
    conditionType: "event_count",
    targetCount: 2,
    eventKeys: ["pipe:passed"],
    reward: { scoreBonus: 600 },
    onEvent: (_world, state, _eventName, payload) => {
      if (payload && (payload as { isNarrowGap?: boolean }).isNarrowGap) {
        state.currentCount++;
        if (state.currentCount >= 2) {
          state.completed = true;
        }
      }
    }
  },
  {
    id: "resistencia_vuelo",
    titleKey: "missions.flappy_resistencia_vuelo.title",
    descriptionKey: "missions.flappy_resistencia_vuelo.description",
    title: "Resistencia en Vuelo",
    description: "Sobrevive durante 20 segundos continuos.",
    conditionType: "continuous_time",
    targetTime: 20,
    reward: { scoreBonus: 700 },
    onInit: (_world, state) => {
      state.customData = { flightTimer: 0 };
    },
    onUpdate: (world, state, deltaTime) => {
      const gs = world.getSingleton("FlappyState") as FlappyBirdState | undefined;
      if (gs && gs.isGameOver) {
        state.failed = true;
        return;
      }
      state.customData.flightTimer += deltaTime;
      state.currentCount = Math.min(20, Math.floor(state.customData.flightTimer));
      state.currentTimer = Math.max(0, 20 - state.customData.flightTimer);
      if (state.customData.flightTimer >= 20) {
        state.completed = true;
      }
    }
  },
  {
    id: "planeo_tactico",
    titleKey: "missions.flappy_planeo_tactico.title",
    descriptionKey: "missions.flappy_planeo_tactico.description",
    title: "Planeo Táctico",
    description: "Mantén el planeo acumulado durante 5 segundos.",
    conditionType: "continuous_time",
    targetTime: 5,
    reward: { scoreBonus: 650 },
    onInit: (_world, state) => {
      state.customData = { glideTimer: 0 };
    },
    onUpdate: (world, state, deltaTime) => {
      const birds = world.query("Bird");
      if (birds.length > 0) {
        const b = world.getComponent(birds[0], "Bird") as BirdComponent | undefined;
        if (b && b.isGliding) {
          state.customData.glideTimer += deltaTime;
          state.currentCount = Math.min(5, Math.floor(state.customData.glideTimer));
          if (state.customData.glideTimer >= 5) {
            state.completed = true;
          }
        }
      }
    }
  }
];

/**
 * Record map of Flappy Bird missions for lookup by ID.
 * @public
 */
export const FLAPPY_BIRD_MISSIONS: Record<string, MissionDefinition> = FLAPPY_BIRD_MINI_MISSIONS.reduce(
  (acc, mission) => {
    acc[mission.id] = mission;
    return acc;
  },
  {} as Record<string, MissionDefinition>
);

/**
 * Ordered list of Flappy Bird mission definitions.
 * @public
 */
export const ALL_FLAPPY_BIRD_MISSIONS: MissionDefinition[] = FLAPPY_BIRD_MINI_MISSIONS;
