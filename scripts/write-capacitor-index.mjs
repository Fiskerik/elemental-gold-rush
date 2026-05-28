import { readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const clientDir = join(process.cwd(), "dist", "client");
const assetsDir = join(clientDir, "assets");
const assets = await readdir(assetsDir);
const css =
  assets.find((name) => /^capacitor-.*\.css$/.test(name)) ??
  assets.find((name) => /^styles-.*\.css$/.test(name));
const entry = "capacitor-entry.js";
await stat(join(assetsDir, entry));

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Elemental Gold Rush</title>
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
      const bootTimeoutMs = 7000;
      const timeoutId = window.setTimeout(() => {
        const el = document.getElementById("boot-fallback");
        if (!el) return;
        if (el.style.display !== "none") {
          el.classList.add("error");
          el.querySelector("p").textContent =
            "Startup timeout: app did not render within " + (bootTimeoutMs / 1000) + "s";
        }
      }, bootTimeoutMs);

      import("/assets/${entry}")
        .then(() => {})
        .catch((error) => {
          window.clearTimeout(timeoutId);
          const msg = error && (error.stack || error.message) ? (error.stack || error.message) : String(error);
          const el = document.getElementById("boot-fallback");
          if (!el) return;
          el.classList.add("error");
          el.querySelector("p").textContent = "Import failed: " + msg;
        });
    </script>
  </head>
  <body>
    <script>
      window.__CAPACITOR_DEBUG__ = true;
      window.addEventListener("error", function (event) {
        var message = event && event.message ? event.message : "Unknown runtime error";
        var filename = event && event.filename ? event.filename : "";
        var line = event && event.lineno ? event.lineno : "";
        var col = event && event.colno ? event.colno : "";
        var stack = event && event.error && event.error.stack ? String(event.error.stack) : "";
        var details = message + "\\n" + filename + ":" + line + ":" + col + (stack ? "\\n\\n" + stack : "");
        document.body.innerHTML =
          '<pre style="white-space:pre-wrap;word-break:break-word;color:#ffb4b4;background:#12070a;padding:16px;margin:0;min-height:100dvh;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;">' +
          details.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
          "</pre>";
      });
    </script>
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

await writeFile(join(clientDir, "index.html"), indexHtml);
console.log(`Wrote Capacitor index.html using ${entry}`);
