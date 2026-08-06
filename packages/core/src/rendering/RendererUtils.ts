import { Renderer } from "./Renderer";
import { ComponentRegistry } from "../ecs/Component";

export type RendererRegistrationCallback = (renderer: any) => void;

export interface RendererRegistrationConfig {
  canvas?: RendererRegistrationCallback;
  skia?: RendererRegistrationCallback;
}

export class RendererUtils {
  /**
   * Registra assets, formas y efectos basándose en el tipo de renderizador activo.
   * Elimina la necesidad de hacer branching (if/else) y casteo manual (as any)
   * en las clases de los juegos.
   */
  public static registerAssets<T extends ComponentRegistry>(
    renderer: Renderer<T, any>,
    config: RendererRegistrationConfig
  ): void {
    const rendererType = (renderer as any).type;

    if (rendererType === "canvas" && config.canvas) {
      config.canvas(renderer);
    } else if (rendererType === "skia" && config.skia) {
      config.skia(renderer);
    } else if (!rendererType) {
      console.warn("[RendererUtils] No se pudo determinar el tipo de renderizador (missing 'type' property).");
    }
  }
}
