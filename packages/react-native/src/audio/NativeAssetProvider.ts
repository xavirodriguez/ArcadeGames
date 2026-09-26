import type { IAssetProvider } from "@tiny-aster/core";
import { resolveNativeAudioSource } from "./nativeAudioManifest";

/**
 * Native asset provider for React Native/Expo environments.
 * Delegates audio loading to {@link resolveNativeAudioSource} and image loading to local bundled assets or Expo asset resolver.
 *
 * @public
 */
export class NativeAssetProvider implements IAssetProvider {
  /**
   * Loads or resolves an image asset path for React Native.
   *
   * @param path - File path or URI to the image asset.
   */
  public async loadImage(path: string): Promise<unknown> {
    const resolved = resolveNativeAudioSource(path);
    if (typeof resolved === "number" || typeof resolved === "object") {
      return resolved;
    }
    return { uri: path };
  }

  /**
   * Resolves an audio path or ID to a native Expo asset source or module ID.
   *
   * @param path - Sound ID or file path to the audio asset.
   */
  public async loadAudio(path: string): Promise<unknown> {
    return resolveNativeAudioSource(path);
  }

  /**
   * Loads a font resource in native environment.
   *
   * @param _path - Path or identifier of the font asset.
   */
  public async loadFont(_path: string): Promise<unknown> {
    return true;
  }

  /**
   * Generic resource loader for JSON or data.
   *
   * @param path - Path to the asset.
   */
  public async load(path: string): Promise<unknown> {
    return { path };
  }
}
