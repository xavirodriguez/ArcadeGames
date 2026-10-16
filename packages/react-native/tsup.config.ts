import { defineConfig } from "tsup";

/**
 * Build configuration for `@tiny-aster/react-native`.
 *
 * React, React Native and every `expo-*` package are provided by the consuming
 * Expo application and must never be inlined into this library's bundle.
 * Bundling `expo-audio` would drag in `expo-asset`, whose
 * `@react-native/assets-registry/registry` import cannot be resolved under
 * pnpm's isolated `node_modules` layout.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-native", /^expo($|[-/])/, /^@react-native\//],
});
