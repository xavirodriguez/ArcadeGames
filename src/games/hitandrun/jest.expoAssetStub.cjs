/**
 * Small expo-asset stand-in for Hit&Run unit tests.
 *
 * Metro resolves bundled PNG requires to asset module ids. Jest runs in Node,
 * so this mock returns an Asset-like object without loading or parsing image
 * bytes. Hit&Run only needs uri, localUri, and downloadAsync during preload.
 */
function fromModule(moduleId) {
  const name = String(moduleId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uri = `file:///jest-assets/${name}.png`;
  const asset = {
    name,
    type: "png",
    hash: null,
    uri,
    localUri: uri,
    width: 64,
    height: 64,
    downloaded: true,
    downloading: false,
    downloadAsync: async () => asset
  };
  return asset;
}

module.exports = {
  Asset: {
    fromModule
  }
};
