import { Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import { BaseRoom } from "./BaseRoom";

export class PongState extends Schema {
  @type("number") ballX: number = 0;
  @type("number") ballY: number = 0;
}

export class PongRoom extends BaseRoom<PongState> {
  protected setupSimulation(_options: unknown): void {
    this.setState(new PongState());
  }

  async onCreate(options: unknown): Promise<void> {
    await super.onCreate(options);
    this.onMessage("move", (_client: Client, _data: any) => {});
  }

  protected spawnPlayer(_client: Client, _validOptions: unknown): void {}

  protected despawnPlayer(_client: Client, _entity?: number): void {}

  protected syncWorldToSchema(): void {}
}
