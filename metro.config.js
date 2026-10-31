const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

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
// Custom Middleware to serve static files from public/ (e.g. /audio/*, /assets/*)
// ---------------------------------------------------------------------------
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const parsedUrl = new URL(req.url ?? "/", "http://localhost");

      // Intercept requests for static files that exist directly under public/
      // (e.g. /audio/*, /assets/fonts/*, /assets/images/*, /canvaskit.wasm)
      const relativePath = parsedUrl.pathname.replace(/^\/+/, "");
      if (relativePath.length > 0 && !relativePath.includes("..")) {
        const filePath = path.join(__dirname, "public", relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          if (filePath.endsWith(".mp3"))
            res.setHeader("Content-Type", "audio/mpeg");
          else if (filePath.endsWith(".wav"))
            res.setHeader("Content-Type", "audio/wav");
          else if (filePath.endsWith(".ogg"))
            res.setHeader("Content-Type", "audio/ogg");
          else if (filePath.endsWith(".flac"))
            res.setHeader("Content-Type", "audio/flac");
          else if (filePath.endsWith(".ttf"))
            res.setHeader("Content-Type", "font/ttf");
          else if (filePath.endsWith(".otf"))
            res.setHeader("Content-Type", "font/otf");
          else if (filePath.endsWith(".woff"))
            res.setHeader("Content-Type", "font/woff");
          else if (filePath.endsWith(".woff2"))
            res.setHeader("Content-Type", "font/woff2");
          else if (filePath.endsWith(".png"))
            res.setHeader("Content-Type", "image/png");
          else if (filePath.endsWith(".wasm"))
            res.setHeader("Content-Type", "application/wasm");
          else res.setHeader("Content-Type", "application/octet-stream");

          return fs.createReadStream(filePath).pipe(res);
        }
      }

      return middleware(req, res, next);
    };
  },
};

module.exports = config;
