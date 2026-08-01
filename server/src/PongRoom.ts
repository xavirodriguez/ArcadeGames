import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import { z } from "zod";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional()
});

const JoinOptionsSchema = z.object({
  name: z.string().max(32).optional()
});

class PongState extends Schema {
  @type("number") ballX!: number;
  @type("number") ballY!: number;
}

export class PongRoom extends Room<{ state: PongState }> {
  onCreate(options: unknown) {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.setState(new PongState());
    this.onMessage("move", (_client: Client, _data: unknown) => {});
  }
  onJoin(client: Client, options: unknown) {
    const parsedOptions = JoinOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};
  }
  onLeave(_client: Client) {}
}
