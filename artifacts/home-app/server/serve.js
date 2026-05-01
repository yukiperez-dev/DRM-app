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

function safeJoin(root, targetPath) {
  const resolvedPath = path.resolve(root, `.${targetPath}`);
  if (!resolvedPath.startsWith(root)) {
    return null;
  }
  return resolvedPath;
}

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const headers = {
    "content-type": contentType,
  };

  if (
    path.basename(filePath) === "service-worker.js" ||
    path.basename(filePath) === "manifest.webmanifest" ||
    ext === ".html"
  ) {
    headers["cache-control"] = "no-cache";
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

function findFile(pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
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
    sendFile(matchedFile, res);
    return;
  }

  if (!path.extname(pathname)) {
    const appShell = path.join(DIST_ROOT, "index.html");
    if (fs.existsSync(appShell)) {
      sendFile(appShell, res);
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
