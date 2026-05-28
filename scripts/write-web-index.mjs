import { readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const webDir = join(process.cwd(), "dist");
const assetsDir = join(webDir, "assets");
const assets = await readdir(assetsDir);
const css = assets.find((name) => /^web-.*\.css$/.test(name));
const entry = "web-entry.js";
await stat(join(assetsDir, entry));

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Elemental Gold Rush</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    ${css ? `<link rel="stylesheet" href="/assets/${css}" />` : ""}
    <style>
      body {
        margin: 0;
        background: #0a0a1a;
        color: #e8edf8;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
      }
      #boot-fallback {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        text-align: center;
        padding: 24px;
      }
      #boot-fallback h1 {
        margin: 0 0 8px;
        font-size: 20px;
      }
      #boot-fallback p {
        margin: 0;
        font-size: 13px;
        color: #9fb0cc;
      }
      #boot-fallback.error p {
        color: #ff9b9b;
      }
    </style>
    <script>
      function setBootError(message) {
        var el = document.getElementById("boot-fallback");
        if (!el) return;
        el.classList.add("error");
        var text = (message && String(message).trim()) ? String(message) : "Unknown startup error";
        el.querySelector("p").textContent = "Startup error: " + text;
      }

      window.__bootReady = function () {
        var el = document.getElementById("boot-fallback");
        if (!el) return;
        el.style.display = "none";
      };

      window.addEventListener("error", function (event) {
        setBootError(event && event.message ? event.message : "Unhandled runtime error");
      });

      window.addEventListener("unhandledrejection", function (event) {
        var reason = event && event.reason ? String(event.reason) : "Unhandled promise rejection";
        setBootError(reason);
      });
    </script>
    <script type="module">
      import("/assets/${entry}")
        .then(() => {})
        .catch((error) => {
          const msg = error && (error.stack || error.message) ? (error.stack || error.message) : String(error);
          const el = document.getElementById("boot-fallback");
          if (!el) return;
          el.classList.add("error");
          el.querySelector("p").textContent = "Import failed: " + msg;
        });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <div id="boot-fallback">
      <div>
        <h1>Elemental Gold Rush</h1>
        <p>Loading...</p>
      </div>
    </div>
  </body>
</html>
`;

await writeFile(join(webDir, "index.html"), indexHtml);
console.log(`Wrote web index.html using ${entry}`);
