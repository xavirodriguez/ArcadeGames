import { System, World, ComponentRegistry, EventBus } from "@tiny-aster/core";
import { MissionDefinition, ActiveMissionState } from "./MissionTypes";

/**
 * Shared ECS system that orchestrates minigame mission tracking and progression.
 * Subscribes to world event bus and ticks active mission continuous conditions.
 * @public
 */
export class MissionSystem<TComponents extends ComponentRegistry = ComponentRegistry> extends System<TComponents> {
  private activeMissionState: ActiveMissionState | null = null;
  private registeredEventKeys: Set<string> = new Set();

  constructor(initialMission?: MissionDefinition) {
    super();
    if (initialMission) {
      this.activeMissionState = {
        id: initialMission.id,
        titleKey: initialMission.titleKey,
        descriptionKey: initialMission.descriptionKey,
        title: initialMission.title,
        description: initialMission.description,
        currentCount: 0,
        targetCount: initialMission.targetCount ?? 1,
        currentTimer: initialMission.targetTime ?? 0,
        targetTimer: initialMission.targetTime ?? 0,
        completed: false,
        failed: false,
        reward: initialMission.reward,
        customData: {},
        definition: initialMission
      };
    }
  }

  public override onRegister(world: World<TComponents>): void {
    if (this.activeMissionState) {
      if (this.activeMissionState.definition.onInit) {
        this.activeMissionState.definition.onInit(world, this.activeMissionState);
      }
      world.setResource("ActiveMission", this.activeMissionState);
    }

    const eventBus = world.getEventBus();
    if (!eventBus) return;

    // Listen to generic game events and forward to active mission handler
    const handleEvent = (eventName: string, payload: unknown) => {
      if (world.isReSimulating) return;
      if (!this.activeMissionState || this.activeMissionState.completed || this.activeMissionState.failed) return;

      const def = this.activeMissionState.definition;
      if (def.onEvent) {
        def.onEvent(world, this.activeMissionState, eventName, payload);
        this.syncState(world);
      }
    };

    // Subscribe to standard event topics used by missions
    const standardTopics = [
      "combat:death",
      "asteroid:destroyed",
      "ship:destroyed",
      "ship:hit",
      "bullet:spawned",
      "loot:collected",
      "powerup:collected",
      "ufo:spawned",
      "ufo:destroyed",
      "score:changed",
      "hyperspace:used",
      "combo:updated"
    ];

    for (const topic of standardTopics) {
      if (!this.registeredEventKeys.has(topic)) {
        this.registeredEventKeys.add(topic);
        eventBus.on(topic, (payload: unknown) => handleEvent(topic, payload));
      }
    }
  }

  /**
   * Sets and initializes the active mission for the world.
   */
  public setActiveMission(world: World<TComponents>, definition: MissionDefinition): ActiveMissionState {
    const state: ActiveMissionState = {
      id: definition.id,
      titleKey: definition.titleKey,
      descriptionKey: definition.descriptionKey,
      title: definition.title,
      description: definition.description,
      currentCount: 0,
      targetCount: definition.targetCount ?? 1,
      currentTimer: definition.targetTime ?? 0,
      targetTimer: definition.targetTime ?? 0,
      completed: false,
      failed: false,
      reward: definition.reward,
      customData: {},
      definition
    };

    if (definition.onInit) {
      definition.onInit(world, state);
    }

    this.activeMissionState = state;
    world.setResource("ActiveMission", state);

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emitDeferred("mission:progress", {
        missionId: state.id,
        currentCount: state.currentCount,
        targetCount: state.targetCount,
        currentTimer: state.currentTimer,
        targetTimer: state.targetTimer
      });
    }

    return state;
  }

  /**
   * Gets the active mission state.
   */
  public getActiveMission(): ActiveMissionState | null {
    return this.activeMissionState;
  }

  public completeMission(world: World<TComponents>): void {
    if (!this.activeMissionState || this.activeMissionState.completed || this.activeMissionState.failed) return;

    this.activeMissionState.completed = true;
    world.setResource("ActiveMission", this.activeMissionState);

    if (this.activeMissionState.reward?.scoreBonus) {
      const gsTag = "GameState" as Extract<keyof TComponents, string>;
      if (world.query(gsTag).length > 0) {
        world.mutateSingleton(gsTag, (gs: unknown) => {
          if (gs && typeof gs === "object" && "score" in gs && typeof (gs as { score: unknown }).score === "number") {
            (gs as { score: number }).score += this.activeMissionState!.reward!.scoreBonus!;
          }
        });
      }
    }

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emitDeferred("mission:completed", {
        missionId: this.activeMissionState.id,
        reward: this.activeMissionState.reward
      });
    }
  }

  public failMission(world: World<TComponents>, reason?: string): void {
    if (!this.activeMissionState || this.activeMissionState.completed || this.activeMissionState.failed) return;

    this.activeMissionState.failed = true;
    world.setResource("ActiveMission", this.activeMissionState);

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emitDeferred("mission:failed", {
        missionId: this.activeMissionState.id,
        reason
      });
    }
  }

  public update(world: World<TComponents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (!this.activeMissionState || this.activeMissionState.completed || this.activeMissionState.failed) return;

    const def = this.activeMissionState.definition;
    if (def.onUpdate) {
      def.onUpdate(world, this.activeMissionState, deltaTime);
      this.syncState(world);
    }
  }

  private syncState(world: World<TComponents>): void {
    if (!this.activeMissionState) return;

    world.setResource("ActiveMission", this.activeMissionState);

    if (this.activeMissionState.completed) {
      this.completeMission(world);
    } else if (this.activeMissionState.failed) {
      this.failMission(world, "Failed mission condition");
    }
  }
}
