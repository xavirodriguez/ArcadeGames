/**
 * Postinstall: tell bundlers that canvaskit-wasm must not resolve Node
 * built-ins (fs, path, os) when targeting the browser / Metro web.
 *
 * Without this, Metro fails with:
 *   The package at ".../canvaskit-wasm/bin/full/canvaskit.js"
 *   attempted to import the Node standard library module "fs".
 *
 * Works with pnpm (nested .pnpm store) via require.resolve.
 */
const fs = require('fs');
const path = require('path');

function main() {
  let packageJsonPath;
  try {
    packageJsonPath = require.resolve('canvaskit-wasm/package.json');
  } catch {
    // Optional dep path when Skia is not installed yet
    console.warn(
      '[fix-canvaskit-wasm] canvaskit-wasm not found; skip (install @shopify/react-native-skia first)'
    );
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const browser = {
    ...(packageJson.browser && typeof packageJson.browser === 'object'
      ? packageJson.browser
      : {}),
    fs: false,
    path: false,
    os: false,
  };

  // Avoid noisy rewrites when already applied
  if (
    packageJson.browser &&
    packageJson.browser.fs === false &&
    packageJson.browser.path === false &&
    packageJson.browser.os === false
  ) {
    console.log('[fix-canvaskit-wasm] browser field already set; nothing to do');
    return;
  }

  packageJson.browser = browser;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(
    `[fix-canvaskit-wasm] patched ${path.relative(process.cwd(), packageJsonPath)} (fs/path/os → false)`
  );
}

main();
