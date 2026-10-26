const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");
const url = require("url");

const config = getDefaultConfig(__dirname);

// CSS and Tailwind support for Web
config.isCSSEnabled = true;

// Skia web support
config.resolver.sourceExts.push("skia");

// Serve CanvasKit WASM as a static asset (setup-skia-web copies it to public/)
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// Node built-ins that canvaskit-wasm (Emscripten) references for the Node
// code path. Metro must not try to resolve them on iOS/Android/web.
const NODE_STUBS = new Set([
  "fs",
  "path",
  "os",
  "node:fs",
  "node:path",
  "node:os",
]);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Stub Node stdlib so canvaskit-wasm/bin/full/canvaskit.js can bundle.
  // Runtime only uses these when `process.versions.node` is set (never on RN).
  if (NODE_STUBS.has(moduleName)) {
    return { type: "empty" };
  }

  // Map ws to a mock in frontend builds to avoid resolving Node-specific stream module
  if (moduleName === "ws") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/utils/ws-mock.ts"),
    };
  }

  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// ---------------------------------------------------------------------------
// Custom Middleware to serve static files from public/ (e.g. /audio/*)
// ---------------------------------------------------------------------------
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const parsedUrl = url.parse(req.url, true);

      // Intercept requests for audio assets and serve them from public/audio/
      if (parsedUrl.pathname && parsedUrl.pathname.startsWith("/audio/")) {
        const filePath = path.join(__dirname, "public", parsedUrl.pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // Set appropriate content type based on extension
          if (filePath.endsWith(".mp3"))
            res.setHeader("Content-Type", "audio/mpeg");
          else if (filePath.endsWith(".wav"))
            res.setHeader("Content-Type", "audio/wav");
          else if (filePath.endsWith(".ogg"))
            res.setHeader("Content-Type", "audio/ogg");
          else res.setHeader("Content-Type", "application/octet-stream");

          return fs.createReadStream(filePath).pipe(res);
        }
      }

      return middleware(req, res, next);
    };
  },
};

module.exports = config;
