import type { GameLoop } from "@tiny-aster/core";

/** Shared contract for adapters that turn ECS render ticks into backend frames. */
export function subscribeRenderFrames<TWorld>(
  gameLoop: Pick<GameLoop, "subscribeRender">,
  getWorld: () => TWorld,
  renderFrame: (world: TWorld, alpha: number) => void
): () => void {
  return gameLoop.subscribeRender((alpha) => {
    renderFrame(getWorld(), alpha);
  });
}
