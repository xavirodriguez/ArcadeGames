import { Packr } from "msgpackr";
import { ServerUpdatePayload } from "./NetTypes";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { World, ComponentRegistry, BlueprintRegistryMap } from "../ecs/World";
import { EventRegistry } from "../events/EventBus";
import { System } from "../ecs/System";

const packr = new Packr({
    useRecords: false,
    structuredClone: true
});

/** @public */
export class ReplicationStateTracker {}
/** @public */
export class ClientAckTracker {
    public recordAck(sessionId: string, sequence: number, tick: number): void {}
    public nextSequence(sessionId: string): number { return 0; }
    public getLastAckedSequence(sessionId: string): number { return 0; }
    public getIdleTime(sessionId: string): number { return 0; }
}
/** @public */
export class NetworkDeltaSystem {
    constructor(tracker: ReplicationStateTracker) {}
    public generateDelta<
      TComponents extends ComponentRegistry = ComponentRegistry,
      TEvents extends EventRegistry = EventRegistry,
      TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
    >(
      world: World<TComponents, TEvents, TBlueprints>,
      sessionId: string,
      sequence: number,
      baselineAck: number,
      interestIds: Set<number>,
      forceFull: boolean
    ): ServerUpdatePayload {
        return {
            kind: "delta",
            tick: 0,
            delta: {} as Partial<WorldSnapshot>
        };
    }
}
/** @public */
export interface InterestNode {
    entityId?: number | string;
    priority?: number;
    [key: string]: any;
}

/** @public */
export class NetworkBudgetManager {
    public prioritize(sessionId: string, interest: InterestNode[], selfEntityId?: string): InterestNode[] { return interest; }
}
/** @public */
export class BinaryCompression {
    public static pack(packet: any): Uint8Array {
        return packr.pack(packet);
    }
    public static unpack<T = any>(
        packet: Uint8Array | ArrayBuffer | Buffer,
        validator?: (data: unknown) => data is T
    ): T {
        const buf = packet instanceof Uint8Array ? packet : new Uint8Array(packet);
        const decoded = packr.unpack(buf);
        if (validator && !validator(decoded)) {
            throw new Error("BinaryCompression: Unpacked data failed validation type guard.");
        }
        return decoded as T;
    }
}

/** @public */
export class InterestManagerSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> extends System<TComponents, TEvents> {
    public update(world: World<TComponents, TEvents, TBlueprints>, deltaTime: number): void {}
    public override onRegister(world: World<TComponents, TEvents, TBlueprints>): void {}
    public override dispose(): void {}
}
