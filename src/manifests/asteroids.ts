import type { GameManifest } from "./types";

export const asteroidsManifest = {
  id: "asteroids",
  name: "Asteroids",
  slug: "asteroids",
  scheme: "tinyaster-asteroids",
  android: {
    package: "com.ensable.asteroids",
  },
  ios: {
    bundleIdentifier: "com.ensable.asteroids",
  },
  orientation: "landscape",
  icons: {
    icon: "./assets/icons/asteroids.png",
    adaptiveIcon: "./assets/icons/asteroids-adaptive.png",
    splash: "./assets/icons/asteroids-splash.png",
  },
  usesNetwork: false,
  usesSound: true,
} as const satisfies GameManifest;
