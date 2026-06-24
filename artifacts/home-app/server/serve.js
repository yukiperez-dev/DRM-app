const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST_ROOT = path.resolve(__dirname, "..", "dist");

function normalizeBasePath(input) {
  if (!input || input === "/") {
    return "";
  }

  return `/${input.replace(/^\/+|\/+$/g, "")}`;
}

const basePath = normalizeBasePath(process.env.BASE_PATH);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const COMPRESSIBLE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const NO_CACHE_CONTROL = "no-cache";

function safeJoin(root, targetPath) {
  const resolvedPath = path.resolve(root, `.${targetPath}`);
  const relativePath = path.relative(root, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return resolvedPath;
}

function isCompressedSidecar(targetPath) {
  return targetPath.endsWith(".br") || targetPath.endsWith(".gz");
}

function isNoCacheAsset(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  return (
    path.basename(filePath) === "service-worker.js" ||
    path.basename(filePath) === "manifest.webmanifest" ||
    ext === ".html"
  );
}

function isImmutableAsset(filePath) {
  if (isNoCacheAsset(filePath)) {
    return false;
  }

  const relativePath = path.relative(DIST_ROOT, filePath).split(path.sep).join("/");
  const basename = path.basename(filePath, path.extname(filePath));

  return (
    relativePath.startsWith("_expo/static/") ||
    /(?:^|[-_.])[a-f0-9]{8,}(?:[-_.]|$)/i.test(basename)
  );
}

function isCompressibleAsset(filePath) {
  return COMPRESSIBLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function parseAcceptEncoding(headerValue) {
  const encodings = new Map();

  for (const part of String(headerValue || "").split(",")) {
    const [rawEncoding, ...rawParameters] = part.trim().split(";");
    const encoding = rawEncoding.trim().toLowerCase();
    if (!encoding) {
      continue;
    }

    let quality = 1;
    for (const rawParameter of rawParameters) {
      const [rawKey, rawValue] = rawParameter.trim().split("=");
      if (rawKey.toLowerCase() === "q") {
        const parsedQuality = Number.parseFloat(rawValue);
        quality = Number.isFinite(parsedQuality) ? parsedQuality : 0;
      }
    }

    encodings.set(encoding, quality);
  }

  return encodings;
}

function getEncodingQuality(encodings, encoding) {
  const explicitQuality = encodings.get(encoding);
  if (explicitQuality !== undefined) {
    return explicitQuality;
  }

  const wildcardQuality = encodings.get("*");
  return wildcardQuality !== undefined ? wildcardQuality : 0;
}

function getPrecompressedVariant(filePath, req) {
  if (!isCompressibleAsset(filePath) || req.headers.range) {
    return null;
  }

  const encodings = parseAcceptEncoding(req.headers["accept-encoding"]);
  const variants = [
    { encoding: "br", filePath: `${filePath}.br`, priority: 2 },
    { encoding: "gzip", filePath: `${filePath}.gz`, priority: 1 },
  ]
    .map((variant) => ({
      ...variant,
      quality: getEncodingQuality(encodings, variant.encoding),
    }))
    .filter((variant) => variant.quality > 0 && fs.existsSync(variant.filePath))
    .sort((a, b) => b.quality - a.quality || b.priority - a.priority);

  return variants[0] || null;
}

function getCacheControl(filePath) {
  if (isNoCacheAsset(filePath)) {
    return NO_CACHE_CONTROL;
  }

  if (isImmutableAsset(filePath)) {
    return IMMUTABLE_CACHE_CONTROL;
  }

  return null;
}

function sendFile(filePath, req, res) {
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const variant = getPrecompressedVariant(filePath, req);
  const responsePath = variant ? variant.filePath : filePath;
  const stat = fs.statSync(responsePath);
  const headers = {
    "content-length": stat.size,
    "content-type": contentType,
    "last-modified": stat.mtime.toUTCString(),
  };

  const cacheControl = getCacheControl(filePath);
  if (cacheControl) {
    headers["cache-control"] = cacheControl;
  }

  if (isCompressibleAsset(filePath)) {
    headers.vary = "Accept-Encoding";
  }

  if (variant) {
    headers["content-encoding"] = variant.encoding;
  }

  res.writeHead(200, headers);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(responsePath).pipe(res);
}

function findFile(pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  if (isCompressedSidecar(cleanPath)) {
    return null;
  }

  const candidates = [
    cleanPath,
    `${cleanPath}.html`,
    path.join(cleanPath, "index.html"),
  ];

  for (const candidate of candidates) {
    const filePath = safeJoin(DIST_ROOT, candidate);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return null;
}

function handleRequest(req, res) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname = requestUrl.pathname;

  if (basePath) {
    if (!pathname.startsWith(basePath)) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "API route not available on this server" }));
    return;
  }

  const matchedFile = findFile(pathname);
  if (matchedFile) {
    sendFile(matchedFile, req, res);
    return;
  }

  if (!path.extname(pathname)) {
    const appShell = path.join(DIST_ROOT, "index.html");
    if (fs.existsSync(appShell)) {
      sendFile(appShell, req, res);
      return;
    }
  }

  res.writeHead(404);
  res.end("Not Found");
}

const port = Number.parseInt(process.env.PORT || "3000", 10);

http.createServer(handleRequest).listen(port, "0.0.0.0", () => {
  console.log(`Serving exported web app from ${DIST_ROOT} on port ${port}`);
});
