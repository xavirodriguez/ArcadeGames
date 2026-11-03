/**
 * app.config.ts — config dinámica de Expo.
 *
 * - Sin EXPO_PUBLIC_GAME_ID → config del arcade completo (equivalente a app.json actual).
 * - Con EXPO_PUBLIC_GAME_ID=<id> → name, slug, scheme, package, icons, orientation
 *   y eas.projectId salen del manifest de ese juego.
 *
 * Sustituye app.json: renombra app.json → app.json.bak y deja este archivo en la raíz.
 */

import type { ConfigContext, ExpoConfig } from "expo/config";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  isGameId,
  getManifest,
  type GameId,
  type GameManifest,
} from "./src/manifests/manifests";

const ARCADE_EAS_PROJECT_ID = "73fa3f33-9fb8-472b-a676-868aaac4e963";
const ARCADE_OWNER = "ensable";

const ARCADE_ICON = "./public/images/icon.png";
const ARCADE_ADAPTIVE = "./public/images/adaptive-icon.png";
const ARCADE_SPLASH = "./public/images/splash-icon.png";
const ARCADE_FAVICON = "./public/images/favicon.png";

function resolveIcon(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  const abs = path.resolve(process.cwd(), candidate);
  return existsSync(abs) ? candidate : fallback;
}

function basePlugins(splashImage: string): ExpoConfig["plugins"] {
  return [
    "expo-router",
    "expo-asset",
    "expo-secure-store",
    "expo-audio",
    "expo-web-browser",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: splashImage,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ];
}

function arcadeConfig(): ExpoConfig {
  return {
    name: "asteroides",
    slug: "asteroids",
    version: "1.0.0",
    orientation: "landscape",
    icon: ARCADE_ICON,
    scheme: "asteroides",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ensable.asteroids",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: ARCADE_ADAPTIVE,
        backgroundColor: "#ffffff",
      },
      package: "com.ensable.asteroids",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: ARCADE_FAVICON,
    },
    plugins: basePlugins(ARCADE_SPLASH),
    experiments: {
      typedRoutes: true,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
    },
    extra: {
      router: {},
      eas: {
        projectId: ARCADE_EAS_PROJECT_ID,
      },
      gameId: null,
    },
    owner: ARCADE_OWNER,
  };
}

function singleGameConfig(manifest: GameManifest): ExpoConfig {
  const icon = resolveIcon(manifest.icons.icon, ARCADE_ICON);
  const adaptive = resolveIcon(manifest.icons.adaptiveIcon, ARCADE_ADAPTIVE);
  const splash = resolveIcon(manifest.icons.splash, ARCADE_SPLASH);
  const favicon = resolveIcon(manifest.icons.favicon, ARCADE_FAVICON);

  const plugins = [...basePlugins(splash)] as NonNullable<ExpoConfig["plugins"]>;

  if (manifest.orientation === "portrait") {
    plugins.push([
      "expo-screen-orientation",
      { initialOrientation: "PORTRAIT" },
    ]);
  } else if (manifest.orientation === "landscape") {
    plugins.push([
      "expo-screen-orientation",
      { initialOrientation: "LANDSCAPE" },
    ]);
  }

  return {
    name: manifest.name,
    slug: manifest.slug,
    version: "1.0.0",
    orientation:
      manifest.orientation === "default" ? "default" : manifest.orientation,
    icon,
    scheme: manifest.scheme,
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: manifest.ios.bundleIdentifier,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptive,
        backgroundColor: "#ffffff",
      },
      package: manifest.android.package,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon,
    },
    plugins,
    experiments: {
      typedRoutes: true,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
    },
    extra: {
      router: {},
      eas: {
        projectId: manifest.easProjectId ?? ARCADE_EAS_PROJECT_ID,
      },
      gameId: manifest.id,
      usesNetwork: manifest.usesNetwork,
      usesSound: manifest.usesSound,
    },
    owner: ARCADE_OWNER,
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const raw = process.env.EXPO_PUBLIC_GAME_ID?.trim();

  if (raw && isGameId(raw)) {
    const manifest = getManifest(raw as GameId);
    return {
      ...config,
      ...singleGameConfig(manifest),
    };
  }

  if (raw) {
    console.warn(
      `[app.config] EXPO_PUBLIC_GAME_ID="${raw}" no es un GameId válido. Usando config del arcade.`
    );
  }

  return {
    ...config,
    ...arcadeConfig(),
  };
};
