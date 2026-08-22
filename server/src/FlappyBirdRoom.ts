import { Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { BaseRoom } from "./BaseRoom";

export class Bird extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}

export class FlappyState extends Schema {
  @type({ map: Bird }) birds = new MapSchema<Bird>();
}

export class FlappyBirdRoom extends BaseRoom<FlappyState> {
  protected setupSimulation(_options: unknown): void {
    this.setState(new FlappyState());
  }

  async onCreate(options: unknown): Promise<void> {
    await super.onCreate(options);
    this.allowedActions = ["jump"];
    this.onMessage("jump", (_client: Client) => {});
  }

  protected spawnPlayer(client: Client, _validOptions: unknown): void {
    this.state.birds.set(client.sessionId, new Bird());
  }

  protected despawnPlayer(client: Client, _entity?: number): void {
    this.state.birds.delete(client.sessionId);
  }

  protected syncWorldToSchema(): void {}
}
