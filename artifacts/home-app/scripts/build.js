const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "dist");
const appConfigPath = path.join(projectRoot, "app.json");
const iconSourcePath = path.join(projectRoot, "assets", "images", "icon.png");

function normalizeBasePath(input) {
  if (!input || input === "/") {
    return "";
  }

  return `/${input.replace(/^\/+|\/+$/g, "")}`;
}

const basePath = normalizeBasePath(process.env.BASE_PATH);

function toPublicPath(relativePath) {
  return `${basePath}/${relativePath}`.replace(/\/{2,}/g, "/");
}

function readAppConfig() {
  const appJson = JSON.parse(fs.readFileSync(appConfigPath, "utf8"));
  return appJson.expo || {};
}

function runWebExport() {
  const result = spawnSync(
    "npx",
    ["expo", "export", "-p", "web", "--output-dir", "dist"],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: "1",
      },
    },
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function writeManifest(appConfig) {
  fs.copyFileSync(iconSourcePath, path.join(outputDir, "pwa-icon.png"));

  const manifest = {
    name: appConfig.name || "Home App",
    short_name: appConfig.name || "Home App",
    description: appConfig.description || `${appConfig.name || "Home App"} PWA`,
    start_url: `${basePath || "/"}/`.replace(/\/{2,}/g, "/"),
    scope: `${basePath || "/"}/`.replace(/\/{2,}/g, "/"),
    display: "standalone",
    orientation: "portrait",
    background_color: appConfig.splash?.backgroundColor || "#FDF6EE",
    theme_color: "#F4A261",
    icons: [
      {
        src: toPublicPath("pwa-icon.png"),
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  fs.writeFileSync(
    path.join(outputDir, "manifest.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );
}

function buildPrecacheUrls() {
  const files = walkFiles(outputDir)
    .map((filePath) => path.relative(outputDir, filePath).split(path.sep).join("/"))
    .filter(
      (relativePath) =>
        relativePath !== "service-worker.js" && relativePath !== "manifest.webmanifest",
    );

  const urls = new Set([`${basePath || "/"}/`.replace(/\/{2,}/g, "/")]);

  for (const relativePath of files) {
    if (relativePath === "index.html") {
      urls.add(`${basePath || "/"}/`.replace(/\/{2,}/g, "/"));
      continue;
    }

    urls.add(toPublicPath(relativePath));
  }

  urls.add(toPublicPath("manifest.webmanifest"));
  urls.add(toPublicPath("pwa-icon.png"));

  return Array.from(urls).sort();
}

function writeServiceWorker(appConfig) {
  const cacheName = `${(appConfig.slug || "home-app").replace(/[^a-z0-9-]/gi, "-")}-v${Date.now()}`;
  const precacheUrls = JSON.stringify(buildPrecacheUrls(), null, 2);
  const appShellUrl = JSON.stringify(`${basePath || "/"}/`.replace(/\/{2,}/g, "/"));
  const basePathValue = JSON.stringify(basePath);

  const serviceWorker = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const BASE_PATH = ${basePathValue};
const APP_SHELL_URL = ${appShellUrl};
const PRECACHE_URLS = ${precacheUrls};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isHtmlNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isSameOriginAsset(url) {
  return url.origin === self.location.origin && (BASE_PATH === "" || url.pathname.startsWith(BASE_PATH));
}

function isApiRequest(url) {
  const relativePath = BASE_PATH && url.pathname.startsWith(BASE_PATH)
    ? url.pathname.slice(BASE_PATH.length) || "/"
    : url.pathname;
  return relativePath === "/api" || relativePath.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (!isSameOriginAsset(url)) {
    return;
  }

  if (isApiRequest(url)) {
    return;
  }

  if (isHtmlNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match(APP_SHELL_URL);
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkPromise;
    }),
  );
});
`;

  fs.writeFileSync(path.join(outputDir, "service-worker.js"), serviceWorker);
}

function injectPwaMarkupIntoHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");

  if (!html.includes("manifest.webmanifest")) {
    html = html.replace(
      "</head>",
      `  <link rel="manifest" href="${toPublicPath("manifest.webmanifest")}" />\n  <meta name="theme-color" content="#F4A261" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-status-bar-style" content="default" />\n</head>`,
    );
  }

  if (!html.includes("serviceWorker.register")) {
    html = html.replace(
      "</body>",
      `  <script>\n    if ("serviceWorker" in navigator) {\n      window.addEventListener("load", function () {\n        navigator.serviceWorker.register("${toPublicPath("service-worker.js")}");\n      });\n    }\n  </script>\n</body>`,
    );
  }

  fs.writeFileSync(filePath, html);
}

function injectPwaMarkup() {
  const htmlFiles = walkFiles(outputDir).filter((filePath) => filePath.endsWith(".html"));

  for (const filePath of htmlFiles) {
    injectPwaMarkupIntoHtml(filePath);
  }
}

function main() {
  const appConfig = readAppConfig();

  runWebExport();
  writeManifest(appConfig);
  writeServiceWorker(appConfig);
  injectPwaMarkup();

  console.log("Web export complete with PWA manifest and service worker.");
}

main();
