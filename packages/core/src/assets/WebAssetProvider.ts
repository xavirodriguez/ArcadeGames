import { IAssetProvider } from "./AssetLoader";

/**
 * Default browser and HTML5 implementation of {@link IAssetProvider}.
 *
 * @remarks
 * Uses standard browser APIs (`HTMLImageElement`, `HTMLAudioElement`, `FontFace`, and `fetch`) when executing
 * in web browser contexts, with fallback object stubs when running in Node.js, unit tests, or server environments.
 *
 * @example
 * ```ts
 * const provider = new WebAssetProvider();
 * const img = await provider.loadImage("assets/sprites/ship.png");
 * const audio = await provider.loadAudio("assets/audio/laser.wav");
 * ```
 *
 * @public
 */
export class WebAssetProvider implements IAssetProvider {
  /**
   * Loads an image using the browser `Image` constructor or returns a mock handle in non-browser contexts.
   *
   * @param path - Image asset URL string, import object, or resource handle.
   * @returns Promise resolving to an `HTMLImageElement` in browser or mock image object in server/headless contexts.
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
      } else if (path && typeof path === "object") {
        const obj = path as Record<string, unknown>;
        const uri = obj.uri || obj.localUri || obj.src || obj.default;
        if (typeof uri === "string") {
          img.src = uri;
        } else {
          img.src = String(path);
        }
      } else {
        img.src = String(path);
      }
    });
  }

  /**
   * Loads an audio element using the browser `Audio` constructor or fallback object.
   *
   * @param path - Audio asset URL string, import object, or resource handle.
   * @returns Promise resolving to an `HTMLAudioElement` in browser or mock audio handle in server/headless contexts.
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
   * Loads a font using the browser `FontFace` API and registers it with `document.fonts`.
   *
   * @param path - Font file URL or font name handle.
   * @returns Promise resolving to the loaded `FontFace` instance or fallback handle.
   */
  public async loadFont(path: string | unknown): Promise<unknown> {
    if (typeof document === "undefined" || !("FontFace" in window)) {
      return { font: path };
    }

    try {
      const fontName = typeof path === "string" ? path.split("/").pop()?.split(".")[0] || "CustomFont" : "CustomFont";
      const fontUrl = typeof path === "string" ? `url(${path})` : `url(${String(path)})`;
      const win = window as unknown as { FontFace: new (name: string, url: string) => { load: () => Promise<unknown> } };
      const doc = document as unknown as { fonts: { add: (font: unknown) => void } };
      const fontFace = new win.FontFace(fontName, fontUrl);
      const loaded = await fontFace.load();
      doc.fonts.add(loaded);
      return loaded;
    } catch {
      return { font: path };
    }
  }

  /**
   * Generic resource loader that fetches and parses JSON resources from specified paths.
   *
   * @param path - Target JSON asset URL string or handle.
   * @returns Promise resolving to parsed JSON data object or empty object if fetch is unavailable.
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
