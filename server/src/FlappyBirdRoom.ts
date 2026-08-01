import { Room, Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { z } from "zod";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional()
});

const JoinOptionsSchema = z.object({
  name: z.string().max(32).optional()
});

class Bird extends Schema {
  @type("number") x!: number;
  @type("number") y!: number;
}

class FlappyState extends Schema {
  @type({ map: Bird }) birds = new MapSchema<Bird>();
}

export class FlappyBirdRoom extends Room<{ state: FlappyState }> {
  private random: unknown;

  onCreate(options: unknown) {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.setState(new FlappyState());
    this.setSimulationInterval((_dt: number) => {});
    this.onMessage("jump", (_client: Client) => {});
  }

  onJoin(client: Client, options: unknown) {
    const parsedOptions = JoinOptionsSchema.safeParse(options);
    const _validOptions = parsedOptions.success ? parsedOptions.data : {};

    const bird = new Bird();
    bird.x = 0;
    bird.y = 0;
    this.state.birds.set(client.sessionId, bird);
  }

  onLeave(client: Client) {
    this.state.birds.delete(client.sessionId);
  }
}
