#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(process.cwd(), "dist-e2e");

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(
    "Falta dist-e2e/. Ejecuta `pnpm run e2e:build` antes de servir E2E."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
let port = 8081;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = Number(args[i + 1]);
    i++;
  } else if (/^\d+$/.test(args[i])) {
    port = Number(args[i]);
  }
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".txt": "text/plain; charset=utf-8",
};

function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0]);
  const safe = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(ROOT, safe);
  if (!full.startsWith(ROOT)) return null;

  const candidates = [];
  if (fs.existsSync(full) && fs.statSync(full).isFile()) candidates.push(full);
  if (!path.extname(full)) {
    const html = full + ".html";
    if (fs.existsSync(html) && fs.statSync(html).isFile()) candidates.push(html);
    const indexHtml = path.join(full, "index.html");
    if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).isFile())
      candidates.push(indexHtml);
  }
  if (decoded.endsWith("/")) {
    const indexHtml = path.join(full, "index.html");
    if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).isFile())
      candidates.push(indexHtml);
  }
  return candidates[0] || null;
}

const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url || "/").pathname || "/";
  const file = resolveFile(pathname);
  if (!file) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const type = CONTENT_TYPES[ext] || "application/octet-stream";
  res.setHeader("Content-Type", type);
  fs.createReadStream(file)
    .on("error", () => {
      res.statusCode = 500;
      res.end("Internal Server Error");
    })
    .pipe(res);
});

server.listen(port, () => {
  console.log(`E2E static server running at http://localhost:${port}`);
});

server.on("error", (err) => {
  console.error("E2E static server error:", err.message);
  process.exit(1);
});