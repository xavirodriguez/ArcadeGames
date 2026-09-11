import { World, TransformComponent } from "@tiny-aster/core";
import { MissionDefinition, ActiveMissionState } from "../shared/missions/MissionTypes";

/**
 * Registry of the 12 Asteroids minimissions.
 * @public
 */
export const ASTEROIDS_MINI_MISSIONS: MissionDefinition[] = [
  {
    id: "rey_del_caos",
    titleKey: "missions.rey_del_caos.title",
    descriptionKey: "missions.rey_del_caos.description",
    title: "Rey del Caos",
    description: "Genera una nube de escombros al destruir un asteroide grande y permanece dentro de su radio durante 5 segundos.",
    conditionType: "continuous_time",
    targetTime: 5,
    eventKeys: ["asteroid:destroyed", "combat:death"],
    reward: { scoreBonus: 500, mutatorId: "hyper_drift" },
    onInit: (_world, state) => {
      state.customData = { cloudX: 0, cloudY: 0, cloudActive: false, stayTimer: 0 };
    },
    onEvent: (world, state, _eventName, payload) => {
      if (!state.customData.cloudActive && payload && (payload.size === "large" || payload.asteroidSize === "large")) {
        let x = payload.x;
        let y = payload.y;
        if (x === undefined && payload.entity !== undefined) {
          const t = world.getComponent(payload.entity, "Transform");
          if (t) {
            x = t.x;
            y = t.y;
          }
        }
        if (x !== undefined && y !== undefined) {
          state.customData.cloudX = x;
          state.customData.cloudY = y;
          state.customData.cloudActive = true;
          state.customData.stayTimer = 0;
        }
      }
    },
    onUpdate: (world, state, deltaTime) => {
      if (!state.customData.cloudActive) return;

      const ships = world.query("Ship", "Transform");
      if (ships.length === 0) return;

      const shipTransform = world.getComponent(ships[0], "Transform");
      if (!shipTransform) return;

      const dx = shipTransform.x - state.customData.cloudX;
      const dy = shipTransform.y - state.customData.cloudY;
      const dist = Math.hypot(dx, dy);

      if (dist <= 150) {
        state.customData.stayTimer += deltaTime;
        state.currentCount = Math.min(5, Math.floor(state.customData.stayTimer));
        if (state.customData.stayTimer >= 5) {
          state.completed = true;
        }
      } else {
        state.customData.stayTimer = 0;
        state.currentCount = 0;
      }
    }
  },
  {
    id: "supervivencia_extrema",
    titleKey: "missions.supervivencia_extrema.title",
    descriptionKey: "missions.supervivencia_extrema.description",
    title: "Supervivencia Extrema",
    description: "Llega a 1 vida y sobrevive durante 15 segundos sin morir.",
    conditionType: "continuous_time",
    targetTime: 15,
    reward: { scoreBonus: 1000, mutatorId: "speed_run" },
    onInit: (_world, state) => {
      state.customData = { surviveTimer: 0 };
    },
    onUpdate: (world, state, deltaTime) => {
      const gs = world.getSingleton("GameState") as any;
      if (!gs) return;

      if (gs.lives === 1) {
        state.customData.surviveTimer += deltaTime;
        state.currentCount = Math.min(15, Math.floor(state.customData.surviveTimer));
        state.currentTimer = Math.max(0, 15 - state.customData.surviveTimer);
        if (state.customData.surviveTimer >= 15) {
          state.completed = true;
        }
      } else if (gs.lives === 0) {
        state.failed = true;
      }
    }
  },
  {
    id: "caza_cercana",
    titleKey: "missions.caza_cercana.title",
    descriptionKey: "missions.caza_cercana.description",
    title: "Caza Cercana",
    description: "Destruye un asteroide grande a menos de 100px de distancia de tu nave.",
    conditionType: "event_count",
    targetCount: 1,
    eventKeys: ["asteroid:destroyed", "combat:death"],
    reward: { scoreBonus: 600 },
    onEvent: (world, state, _eventName, payload) => {
      if (!payload) return;
      const isLarge = payload.size === "large" || payload.asteroidSize === "large";
      if (!isLarge) return;

      const ships = world.query("Ship", "Transform");
      if (ships.length === 0) return;
      const shipTransform = world.getComponent(ships[0], "Transform");
      if (!shipTransform) return;

      let astX = payload.x;
      let astY = payload.y;
      if ((astX === undefined || astY === undefined) && payload.entity !== undefined) {
        const t = world.getComponent(payload.entity, "Transform");
        if (t) {
          astX = t.x;
          astY = t.y;
        }
      }

      if (astX !== undefined && astY !== undefined) {
        const dist = Math.hypot(shipTransform.x - astX, shipTransform.y - astY);
        if (dist <= 100) {
          state.currentCount = 1;
          state.completed = true;
        }
      }
    }
  },
  {
    id: "contra_el_reloj",
    titleKey: "missions.contra_el_reloj.title",
    descriptionKey: "missions.contra_el_reloj.description",
    title: "Contra el Reloj",
    description: "Destruye 6 asteroides en menos de 20 segundos.",
    conditionType: "event_count",
    targetCount: 6,
    targetTime: 20,
    eventKeys: ["asteroid:destroyed", "combat:death"],
    reward: { scoreBonus: 750, mutatorId: "speed_run" },
    onInit: (_world, state) => {
      state.customData = { remainingTimer: 20 };
      state.targetTimer = 20;
      state.currentTimer = 20;
    },
    onEvent: (_world, state, _eventName, payload) => {
      if (payload && (payload.type === "Asteroid" || payload.asteroidSize || payload.size)) {
        state.currentCount++;
        if (state.currentCount >= 6) {
          state.completed = true;
        }
      }
    },
    onUpdate: (_world, state, deltaTime) => {
      state.customData.remainingTimer -= deltaTime;
      state.currentTimer = Math.max(0, state.customData.remainingTimer);
      if (state.customData.remainingTimer <= 0 && !state.completed) {
        state.failed = true;
      }
    }
  },
  {
    id: "maestro_multiplicador",
    titleKey: "missions.maestro_multiplicador.title",
    descriptionKey: "missions.maestro_multiplicador.description",
    title: "Maestro del Multiplicador",
    description: "Alcanza un multiplicador de combo de x5 sin reiniciar el combo.",
    conditionType: "state_threshold",
    targetCount: 5,
    reward: { scoreBonus: 800, achievementId: "combo_king" },
    onUpdate: (world, state) => {
      const combos = world.query("Combo");
      if (combos.length > 0) {
        const c = world.getComponent(combos[0], "Combo") as any;
        if (c) {
          state.currentCount = c.multiplier;
          if (c.multiplier >= 5) {
            state.completed = true;
          }
        }
      }
    }
  },
  {
    id: "precision_bajo_presion",
    titleKey: "missions.precision_bajo_presion.title",
    descriptionKey: "missions.precision_bajo_presion.description",
    title: "Precisión Bajo Presión",
    description: "Mantén un multiplicador >= x3 durante 8 segundos consecutivos.",
    conditionType: "continuous_time",
    targetTime: 8,
    reward: { scoreBonus: 900 },
    onInit: (_world, state) => {
      state.customData = { holdTimer: 0 };
    },
    onUpdate: (world, state, deltaTime) => {
      const combos = world.query("Combo");
      if (combos.length > 0) {
        const c = world.getComponent(combos[0], "Combo") as any;
        if (c && c.multiplier >= 3) {
          state.customData.holdTimer += deltaTime;
          state.currentCount = Math.min(8, Math.floor(state.customData.holdTimer));
          if (state.customData.holdTimer >= 8) {
            state.completed = true;
          }
        } else {
          state.customData.holdTimer = 0;
          state.currentCount = 0;
        }
      }
    }
  },
  {
    id: "cazador_nucleos",
    titleKey: "missions.cazador_nucleos.title",
    descriptionKey: "missions.cazador_nucleos.description",
    title: "Cazador de Núcleos",
    description: "Destruye 5 asteroides y recolecta 2 power-ups.",
    conditionType: "composite",
    targetCount: 7,
    eventKeys: ["asteroid:destroyed", "combat:death", "loot:collected", "powerup:collected"],
    reward: { scoreBonus: 850 },
    onInit: (_world, state) => {
      state.customData = { asteroids: 0, powerups: 0 };
    },
    onEvent: (_world, state, eventName, payload) => {
      if (eventName === "asteroid:destroyed" || (eventName === "combat:death" && (payload?.type === "Asteroid" || payload?.size))) {
        state.customData.asteroids++;
      } else if (eventName === "loot:collected" || eventName === "powerup:collected") {
        state.customData.powerups++;
      }
      state.currentCount = Math.min(5, state.customData.asteroids) + Math.min(2, state.customData.powerups);
      if (state.customData.asteroids >= 5 && state.customData.powerups >= 2) {
        state.completed = true;
      }
    }
  },
  {
    id: "nave_fantasma",
    titleKey: "missions.nave_fantasma.title",
    descriptionKey: "missions.nave_fantasma.description",
    title: "Nave Fantasma",
    description: "Sobrevive 15 segundos sin disparar una sola bala.",
    conditionType: "continuous_time",
    targetTime: 15,
    eventKeys: ["bullet:spawned"],
    reward: { scoreBonus: 700, mutatorId: "ghost_ball" },
    onInit: (_world, state) => {
      state.customData = { ghostTimer: 0 };
    },
    onEvent: (_world, state) => {
      state.customData.ghostTimer = 0;
      state.currentCount = 0;
    },
    onUpdate: (_world, state, deltaTime) => {
      state.customData.ghostTimer += deltaTime;
      state.currentCount = Math.min(15, Math.floor(state.customData.ghostTimer));
      if (state.customData.ghostTimer >= 15) {
        state.completed = true;
      }
    }
  },
  {
    id: "bailarin_espacial",
    titleKey: "missions.bailarin_espacial.title",
    descriptionKey: "missions.bailarin_espacial.description",
    title: "Bailarín Espacial",
    description: "Usa el salto al hiperspacio 3 veces sin morir.",
    conditionType: "event_count",
    targetCount: 3,
    eventKeys: ["hyperspace:used", "ship:destroyed"],
    reward: { scoreBonus: 650 },
    onEvent: (_world, state, eventName) => {
      if (eventName === "hyperspace:used") {
        state.currentCount++;
        if (state.currentCount >= 3) {
          state.completed = true;
        }
      } else if (eventName === "ship:destroyed") {
        state.failed = true;
      }
    }
  },
  {
    id: "doble_amenaza",
    titleKey: "missions.doble_amenaza.title",
    descriptionKey: "missions.doble_amenaza.description",
    title: "Doble Amenaza",
    description: "Destruye un UFO y un asteroide grande en menos de 10s (o 2 asteroides grandes si no hay UFO).",
    conditionType: "composite",
    targetCount: 2,
    eventKeys: ["asteroid:destroyed", "combat:death"],
    reward: { scoreBonus: 1000 },
    onInit: (_world, state) => {
      state.customData = { ufoKilled: false, largeAsteroids: 0, timer: 10 };
      state.targetTimer = 10;
      state.currentTimer = 10;
    },
    onEvent: (_world, state, _eventName, payload) => {
      if (!payload) return;
      if (payload.type === "Ufo" || payload.entityType === "Ufo" || payload.isUfo) {
        state.customData.ufoKilled = true;
      }
      if (payload.size === "large" || payload.asteroidSize === "large") {
        state.customData.largeAsteroids++;
      }
      const count = (state.customData.ufoKilled ? 1 : 0) + Math.min(1, state.customData.largeAsteroids);
      state.currentCount = Math.max(count, Math.min(2, state.customData.largeAsteroids));
      if ((state.customData.ufoKilled && state.customData.largeAsteroids >= 1) || state.customData.largeAsteroids >= 2) {
        state.completed = true;
      }
    },
    onUpdate: (_world, state, deltaTime) => {
      state.customData.timer -= deltaTime;
      state.currentTimer = Math.max(0, state.customData.timer);
      if (state.customData.timer <= 0 && !state.completed) {
        state.failed = true;
      }
    }
  },
  {
    id: "escudo_perfecto",
    titleKey: "missions.escudo_perfecto.title",
    descriptionKey: "missions.escudo_perfecto.description",
    title: "Escudo Perfecto",
    description: "Sobrevive la duración completa de un escudo de invulnerabilidad mientras absorbes un impacto.",
    conditionType: "composite",
    targetCount: 1,
    eventKeys: ["combat:death", "ship:hit"],
    reward: { scoreBonus: 800 },
    onInit: (_world, state) => {
      state.customData = { shieldTimer: 0, hitAbsorbed: false };
    },
    onEvent: (_world, state, eventName) => {
      if (eventName === "ship:hit") {
        state.customData.hitAbsorbed = true;
      }
    },
    onUpdate: (world, state, deltaTime) => {
      const ships = world.query("Ship", "Invulnerable");
      if (ships.length > 0) {
        state.customData.shieldTimer += deltaTime;
        state.currentCount = Math.min(1, state.customData.shieldTimer / 5.0);
        if (state.customData.shieldTimer >= 4.5 && state.customData.hitAbsorbed) {
          state.completed = true;
        }
      }
    }
  },
  {
    id: "escudo_ofensivo",
    titleKey: "missions.escudo_ofensivo.title",
    descriptionKey: "missions.escudo_ofensivo.description",
    title: "Escudo Ofensivo",
    description: "Destruye 3 asteroides mientras tienes el escudo de invulnerabilidad activo.",
    conditionType: "event_count",
    targetCount: 3,
    eventKeys: ["asteroid:destroyed", "combat:death"],
    reward: { scoreBonus: 850 },
    onEvent: (world, state, _eventName, payload) => {
      if (payload && (payload.type === "Asteroid" || payload.asteroidSize || payload.size)) {
        const ships = world.query("Ship", "Invulnerable");
        if (ships.length > 0) {
          state.currentCount++;
          if (state.currentCount >= 3) {
            state.completed = true;
          }
        }
      }
    }
  }
];
