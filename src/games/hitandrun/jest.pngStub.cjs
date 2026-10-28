/**
 * Stable stand-in for Metro's numeric PNG module ids in Hit&Run Jest tests.
 * The expo-asset Jest stub consumes this sentinel; tests never decode PNG bytes.
 */
module.exports = "__JEST_PNG_ASSET__";
