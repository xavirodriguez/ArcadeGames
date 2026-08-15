import { IAssetProvider } from "./AssetLoader";

/**
 * Default browser/HTML5 implementation of `IAssetProvider`.
 * Uses HTMLImageElement, HTMLAudioElement, and document.fonts / FontFace API for web environments.
 * @public
 */
export class WebAssetProvider implements IAssetProvider {
  /**
   * Loads an image using browser `Image` constructor or returns a mock/resolved handle in non-browser environments.
   */
  public async loadImage(path: string | unknown): Promise<unknown> {
    if (typeof Image === "undefined") {
      return { src: path, width: 64, height: 64, complete: true };
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`WebAssetProvider: Failed to load image asset at ${path}: ${err}`));

      if (typeof path === "string") {
        img.src = path;
      } else if (path && typeof path === "object" && "default" in path) {
        img.src = (path as { default: string }).default;
      } else {
        img.src = String(path);
      }
    });
  }

  /**
   * Loads an audio element using browser `Audio` constructor or fallback object.
   */
  public async loadAudio(path: string | unknown): Promise<unknown> {
    if (typeof Audio === "undefined") {
      return { src: path, type: "audio" };
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = (err) => reject(new Error(`WebAssetProvider: Failed to load audio asset at ${path}: ${err}`));

      if (typeof path === "string") {
        audio.src = path;
      } else if (path && typeof path === "object" && "default" in path) {
        audio.src = (path as { default: string }).default;
      } else {
        audio.src = String(path);
      }
    });
  }

  /**
   * Loads a font using the FontFace API or document.fonts if available.
   */
  public async loadFont(path: string | unknown): Promise<unknown> {
    if (typeof document === "undefined" || !("FontFace" in window)) {
      return { font: path };
    }

    try {
      const fontName = typeof path === "string" ? path.split("/").pop()?.split(".")[0] || "CustomFont" : "CustomFont";
      const fontUrl = typeof path === "string" ? `url(${path})` : `url(${String(path)})`;
      const fontFace = new (window as any).FontFace(fontName, fontUrl);
      const loaded = await fontFace.load();
      (document.fonts as any).add(loaded);
      return loaded;
    } catch {
      return { font: path };
    }
  }

  /**
   * Generic loader (e.g. JSON via fetch).
   */
  public async load(path: string | unknown): Promise<unknown> {
    if (typeof fetch === "undefined") {
      return {};
    }
    const url = typeof path === "string" ? path : String(path);
    const response = await fetch(url);
    return response.json();
  }
}
