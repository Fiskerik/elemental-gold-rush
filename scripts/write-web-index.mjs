import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
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

const staticPageChrome = (title, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${title} | Elemental Gold Rush</title>
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
      .shell {
        min-height: 100dvh;
        max-width: 880px;
        margin: 0 auto;
        padding: 24px;
      }
      .card {
        background: rgba(24, 28, 62, 0.95);
        border: 1px solid rgba(104, 127, 204, 0.28);
        border-radius: 14px;
        padding: 16px;
        margin-top: 14px;
      }
      h1 { margin: 0; font-size: 34px; line-height: 1.1; }
      h2 { margin: 0 0 8px; font-size: 20px; line-height: 1.25; }
      p, li { color: #cfd8ea; line-height: 1.6; }
      a { color: #79d6ff; }
      .muted { color: #a9b4cc; margin-top: 8px; }
      .links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
      .btn {
        display: inline-flex;
        align-items: center;
        text-decoration: none;
        border-radius: 10px;
        border: 1px solid rgba(109, 134, 214, 0.44);
        background: rgba(16, 20, 49, 0.95);
        color: #ecf2ff;
        font-weight: 700;
        padding: 8px 12px;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      ${body}
      <div class="links">
        <a class="btn" href="/">Back to game</a>
        <a class="btn" href="/support">Support</a>
        <a class="btn" href="/terms">Terms</a>
        <a class="btn" href="/privacy">Privacy</a>
      </div>
    </main>
  </body>
</html>
`;

const termsBody = `
  <h1>Terms of Service</h1>
  <p class="muted">Last updated: May 28, 2026</p>
  <section class="card">
    <h2>Acceptance of Terms</h2>
    <p>By using Elemental Gold Rush, you agree to these Terms and our Privacy Policy.</p>
  </section>
  <section class="card">
    <h2>License to Use</h2>
    <p>We grant you a limited, non-exclusive, non-transferable license to use the game for personal, non-commercial entertainment.</p>
  </section>
  <section class="card">
    <h2>In-App Purchases</h2>
    <p>Purchases are processed by Apple and RevenueCat. Billing and refunds are governed by platform store policies and applicable law.</p>
  </section>
  <section class="card">
    <h2>Contact</h2>
    <p>Support: <a href="mailto:eaconsulting.supp@gmail.com">eaconsulting.supp@gmail.com</a></p>
  </section>
`;

const privacyBody = `
  <h1>Privacy Policy</h1>
  <p class="muted">Last updated: May 28, 2026</p>
  <section class="card">
    <h2>Overview</h2>
    <p>This policy explains how Elemental Gold Rush handles gameplay data, purchase status, and ad-related metadata on supported platforms.</p>
  </section>
  <section class="card">
    <h2>Data We Process</h2>
    <ul>
      <li>Local gameplay progress and settings.</li>
      <li>Purchase and entitlement status via Apple and RevenueCat.</li>
      <li>Ad consent and ad-delivery metadata when ads are enabled.</li>
    </ul>
  </section>
  <section class="card">
    <h2>Contact</h2>
    <p>Privacy and support requests: <a href="mailto:eaconsulting.supp@gmail.com">eaconsulting.supp@gmail.com</a></p>
  </section>
`;

const supportBody = `
  <h1>Support</h1>
  <p class="muted">Need help with Elemental Gold Rush? We are happy to help.</p>
  <section class="card">
    <h2>Contact</h2>
    <p>Email: <a href="mailto:eaconsulting.supp@gmail.com">eaconsulting.supp@gmail.com</a></p>
    <p>Typical response time: 1-3 business days.</p>
  </section>
  <section class="card">
    <h2>How to Report an Issue</h2>
    <ul>
      <li>Device model (for example, iPhone 14 Pro).</li>
      <li>iOS version.</li>
      <li>App version/build number.</li>
      <li>Exact steps to reproduce the issue.</li>
      <li>Screenshot or short video if possible.</li>
    </ul>
  </section>
`;

async function writeStaticLegalPage(slug, title, body) {
  const html = staticPageChrome(title, body);
  await mkdir(join(webDir, slug), { recursive: true });
  await writeFile(join(webDir, slug, "index.html"), html);
  await writeFile(join(webDir, `${slug}.html`), html);
}

await writeStaticLegalPage("terms", "Terms of Service", termsBody);
await writeStaticLegalPage("privacy", "Privacy Policy", privacyBody);
await writeStaticLegalPage("support", "Support", supportBody);
console.log("Wrote static legal/support pages for /terms, /privacy, and /support");
