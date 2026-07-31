import { World, BlueprintRegistryMap } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";
import { NetworkManager } from "./NetworkManager";
import { NullTransport } from "./NullTransport";
import { InputFrame, ServerUpdatePayload, DeltaSnapshotPayload, FullSnapshotPayload } from "./NetTypes";

/**
 * Handles replication, prediction, and server updates for games.
 * @public
 */
export class NetworkController<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  public networkManager?: NetworkManager<TEvents, any, TComponents, TBlueprints>;
  public lastProcessedFullStateVersion = -1;
  public isMultiplayer = false;
  private world: World<TComponents, TEvents, TBlueprints>;
  private runSimStep: (deltaTime: number, isResimulating: boolean) => void;

  constructor(
    world: World<TComponents, TEvents, TBlueprints>,
    runSimStep?: (deltaTime: number, isResimulating: boolean) => void
  ) {
    this.world = world;
    this.runSimStep = runSimStep ?? ((dt) => world.update(dt));
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
    if (!active) {
      this.networkManager?.setTransport(new NullTransport<TEvents, any>());
    }
  }

  public applyInputToEntity(entityId: number, input: InputFrame) {
    if (!this.world.hasComponent(entityId, "Input" as any)) {
      this.world.addComponent(entityId, {
        type: "Input",
        actions: new Set<string>(),
        axes: {}
      } as any);
    }
    this.world.mutateComponent(entityId, "Input" as any, (inputComp: any) => {
      inputComp.actions = new Set<string>(input.actions || []);
      inputComp.axes = { ...input.axes };
    });
  }

  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    const localPlayer = this.world.query("LocalPlayer" as any)[0];
    if (localPlayer !== undefined) {
      this.applyInputToEntity(localPlayer, input);
    }

    // Actual simulation step
    this.runSimulationStep(deltaTime, false);

    if (this.isMultiplayer && this.networkManager) {
      const strategy = this.networkManager.getStrategy() as { recordPrediction?: (input: any, world: any) => void } | undefined;
      if (strategy && strategy.recordPrediction) {
        strategy.recordPrediction(input, this.world);
      }
    }
  }

  public runSimulationStep(deltaTime: number, isResimulating: boolean) {
    const random = this.world.gameplayRandom;
    const wasLocked = random ? random.isLocked() : false;

    if (random) {
      random.unlock();
    }

    try {
      this.runSimStep(deltaTime, isResimulating);
    } finally {
      if (random && wasLocked) {
        random.lock();
      }
    }
  }

  public updateFromServer(payload: ServerUpdatePayload, localSessionId?: string) {
    if (!this.isMultiplayer || !payload || !this.networkManager) return;

    if (payload.kind === "delta") {
        this.handleDeltaServerUpdate(payload, localSessionId);
    } else if (payload.kind === "full") {
        this.handleFullServerUpdate(payload, localSessionId);
    }
  }

  private handleDeltaServerUpdate(payload: DeltaSnapshotPayload, localSessionId?: string) {
    const serverTick = payload.tick;
    const delta = payload.delta;

    if (!this.networkManager) return;

    this.networkManager.processServerUpdate(serverTick, delta as any, localSessionId);

    const eventBus = this.world.getEventBus();
    if (eventBus && (delta as any).stateVersion !== undefined) {
      eventBus.emit("net:ack_version" as any, { version: (delta as any).stateVersion, tick: serverTick } as any);
    }
  }

  private handleFullServerUpdate(payload: FullSnapshotPayload, localSessionId?: string) {
    if (!this.networkManager) return;
    const authoritativeSnapshot = payload.fullWorldState;

    if (authoritativeSnapshot.stateVersion === this.lastProcessedFullStateVersion) return;
    this.lastProcessedFullStateVersion = authoritativeSnapshot.stateVersion;

    const serverTick = payload.serverTick;
    this.networkManager.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
  }
}
