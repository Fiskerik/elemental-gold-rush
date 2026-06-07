import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 4173);
const rootDir = normalize(
  join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist"),
);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const routeFiles = {
  "/": "index.html",
  "/game": "index.html",
  "/game/": "index.html",
  "/privacy": "privacy/index.html",
  "/privacy/": "privacy/index.html",
  "/support": "support/index.html",
  "/support/": "support/index.html",
  "/terms": "terms/index.html",
  "/terms/": "terms/index.html",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const pathname = decodeURIComponent(url.pathname);
    const filePath = await resolveFilePath(pathname);

    let fileStat = await stat(filePath);
    let resolvedPath = filePath;
    if (fileStat.isDirectory()) {
      resolvedPath = join(filePath, "index.html");
      fileStat = await stat(resolvedPath);
    }
    if (!fileStat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = extname(resolvedPath).toLowerCase();
    const mimeType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": String(fileStat.size),
      "Content-Type": mimeType,
    });
    createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Static dist server listening on http://127.0.0.1:${port}`);
});

async function resolveFilePath(pathname) {
  if (routeFiles[pathname]) {
    return join(rootDir, routeFiles[pathname]);
  }

  const sanitized = pathname.replace(/^\/+/, "");
  const directPath = normalize(join(rootDir, sanitized));
  if (!directPath.startsWith(rootDir)) {
    throw new Error("Path traversal blocked");
  }

  try {
    await access(directPath);
    return directPath;
  } catch {
    return join(rootDir, "index.html");
  }
}
