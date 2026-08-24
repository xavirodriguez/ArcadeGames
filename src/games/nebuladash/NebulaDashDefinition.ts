import { NebulaDashGame } from "./NebulaDashGame";

export const NebulaDashDefinition = {
  name: "nebuladash",
  createSimulation: (seed: number) => {
    const game = new NebulaDashGame({ seed });
    return game;
  },
  inputSchema: {
    actions: ["moveLeft", "moveRight", "jump"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};
