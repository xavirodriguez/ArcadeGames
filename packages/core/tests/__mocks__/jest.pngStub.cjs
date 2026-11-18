/**
 * Jest stub for PNG asset requires in Core tests.
 *
 * Metro resolves bundled PNG requires to numeric asset module ids; Jest runs in
 * Node and has no such mapping, so every `require("...png")` is mapped here to a
 * stable dummy URI string. Consumers only store it as `imageSource`, and
 * `WebAssetProvider.load` short-circuits when `fetch` is unavailable, so tests
 * never attempt real network I/O or decode PNG bytes.
 */
module.exports = "stub://png-for-jest";
