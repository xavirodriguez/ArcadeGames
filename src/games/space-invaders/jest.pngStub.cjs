/**
 * Jest stub for PNG asset requires.
 *
 * SpriteRegistry.ts calls `require("...png")` at module scope (Metro asset
 * modules resolve to a numeric asset id at runtime, and React Native's
 * jest-expo preset maps them automatically). This plain jest config has no
 * such mapping, so we map every `.png` require here to a stable dummy value.
 * It must not be `undefined`/`null`: consumers only store it as `imageSource`,
 * but a real module object keeps the require well-formed.
 */
module.exports = { __esModule: true, default: 0, uri: "stub://png-for-jest" };
