import type { GameManifest } from "./types";

export const pongManifest = {
  id: "pong",
  name: "Pong",
  slug: "pong",
  scheme: "tinyaster-pong",
  android: {
    package: "com.ensable.pong",
  },
  ios: {
    bundleIdentifier: "com.ensable.pong",
  },
  orientation: "landscape",
  icons: {
    icon: "./assets/icons/pong.png",
    adaptiveIcon: "./assets/icons/pong-adaptive.png",
    splash: "./assets/icons/pong-splash.png",
  },
  usesNetwork: true,
  usesSound: true,
} as const satisfies GameManifest;
