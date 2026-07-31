import { Renderer } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { drawAsteroidsShip, drawAsteroidsBullet, drawAsteroidsAsteroid, drawAsteroidsParticle } from "./AsteroidsCanvasVisuals";

/** @public */
export const initializeAsteroidsRenderer = (renderer: Renderer<AsteroidsComponentRegistry>) => {
  if ((renderer as any).type === "canvas") {
    (renderer as any).registerShape("ship", drawAsteroidsShip);
    (renderer as any).registerShape("bullet", drawAsteroidsBullet);
    (renderer as any).registerShape("asteroid", drawAsteroidsAsteroid);
    (renderer as any).registerShape("particle", drawAsteroidsParticle);
  }
};
