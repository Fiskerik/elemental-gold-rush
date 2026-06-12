import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Extract the translation data objects directly from the generated TS file.
// The data section is authored as JSON-compatible literals, so we can isolate
// each export and JSON.parse it without a TypeScript loader.
async function loadLegalData() {
  const src = await readFile(
    join(process.cwd(), "src/content/legalDocs.generated.ts"),
    "utf8",
  );

  const extractLiteral = (marker, open, close) => {
    const markerIdx = src.indexOf(marker);
    if (markerIdx === -1) throw new Error(`Missing ${marker} in legal data`);
    const eqIdx = src.indexOf("=", markerIdx);
    const start = src.indexOf(open, eqIdx);
    let depth = 0;
    for (let i = start; i < src.length; i++) {
      const ch = src[i];
      if (ch === '"') {
        i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i] === "\\") i++;
          i++;
        }
        continue;
      }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return JSON.parse(src.slice(start, i + 1));
      }
    }
    throw new Error(`Unbalanced literal for ${marker}`);
  };

  const languages = extractLiteral("LEGAL_LANGUAGES", "[", "]");
  const privacy = extractLiteral("PRIVACY_CONTENT", "{", "}");
  const terms = extractLiteral("TERMS_CONTENT", "{", "}");
  const dateMatch = src.match(/LEGAL_LAST_UPDATED_DATE\s*=\s*"([^"]*)"/);
  const lastUpdated = dateMatch ? dateMatch[1] : "";

  return { languages, privacy, terms, lastUpdated };
}

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
    <title>Atomic Fusion Rush</title>
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
        <h1>Atomic Fusion Rush</h1>
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
    <title>${title} | Atomic Fusion Rush</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    ${css ? `<link rel="stylesheet" href="/assets/${css}" />` : ""}
    <style>
      body {
        margin: 0;
        background: #0a0a1a;
        color: #e8edf8;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
        overflow-y: auto;
        user-select: text;
      }
      .shell {
        min-height: 100dvh;
        max-width: 880px;
        margin: 0 auto;
        padding: 0 24px 40px;
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: calc(env(safe-area-inset-top, 0px) + 14px) 0 14px;
        background: linear-gradient(180deg, #0a0a1a 0%, rgba(10, 10, 26, 0.92) 72%, rgba(10, 10, 26, 0) 100%);
        backdrop-filter: blur(12px);
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
      .navlinks { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        border-radius: 10px;
        border: 1px solid rgba(109, 134, 214, 0.44);
        background: rgba(16, 20, 49, 0.95);
        color: #ecf2ff;
        font-weight: 700;
        padding: 8px 12px;
      }
      @media (max-width: 560px) {
        .shell { padding-left: 16px; padding-right: 16px; }
        .topbar { flex-direction: column; }
        .navlinks .btn { flex: 1 1 0; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <nav class="topbar" aria-label="Page navigation">
        <a class="btn" href="/game">Back to game</a>
        <div class="navlinks">
          <a class="btn" href="/support.html">Support</a>
          <a class="btn" href="/terms.html">Terms</a>
          <a class="btn" href="/privacy.html">Privacy</a>
        </div>
      </nav>
      ${body}
      <div class="links">
        <a class="btn" href="/game">Back to game</a>
        <a class="btn" href="/support.html">Support</a>
        <a class="btn" href="/terms.html">Terms</a>
        <a class="btn" href="/privacy.html">Privacy</a>
      </div>
    </main>
  </body>
</html>
`;

const supportBody = `
  <h1>Support</h1>
  <p class="muted">Need help with Atomic Fusion Rush? We are happy to help.</p>
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

// Translated legal page (privacy / terms) with a language dropdown that mirrors
// the in-app React LegalDocument component. All translations are embedded so the
// page works as a fully static file with no network calls.
const legalPageHtml = (slug, fallbackTitle, docs, languages, lastUpdated) => {
  const payload = JSON.stringify({ docs, languages, lastUpdated }).replace(
    /</g,
    "\\u003c",
  );
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${fallbackTitle} | Atomic Fusion Rush</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    ${css ? `<link rel="stylesheet" href="/assets/${css}" />` : ""}
    <style>
      body {
        margin: 0;
        background: #0a0a1a;
        color: #e8edf8;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
        overflow-y: auto;
        user-select: text;
      }
      .shell { min-height: 100dvh; max-width: 880px; margin: 0 auto; padding: 0 24px 40px; }
      .topbar {
        position: sticky; top: 0; z-index: 2;
        display: flex; justify-content: space-between; gap: 12px;
        padding: calc(env(safe-area-inset-top, 0px) + 14px) 0 14px;
        background: linear-gradient(180deg, #0a0a1a 0%, rgba(10, 10, 26, 0.92) 72%, rgba(10, 10, 26, 0) 100%);
        backdrop-filter: blur(12px);
      }
      .card { background: rgba(24, 28, 62, 0.95); border: 1px solid rgba(104, 127, 204, 0.28); border-radius: 14px; padding: 16px; margin-top: 14px; }
      h1 { margin: 0; font-size: 34px; line-height: 1.1; }
      h2 { margin: 0 0 8px; font-size: 20px; line-height: 1.25; }
      p, li { color: #cfd8ea; line-height: 1.6; }
      a { color: #79d6ff; }
      .muted { color: #a9b4cc; margin-top: 8px; }
      .links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
      .navlinks { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .btn {
        display: inline-flex; align-items: center; justify-content: center;
        text-decoration: none; border-radius: 10px;
        border: 1px solid rgba(109, 134, 214, 0.44); background: rgba(16, 20, 49, 0.95);
        color: #ecf2ff; font-weight: 700; padding: 8px 12px;
      }
      .langbar { display: flex; justify-content: flex-end; margin-top: 12px; }
      .langpicker { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #a9b4cc; font-weight: 600; }
      .langpicker select {
        appearance: none; -webkit-appearance: none;
        background: rgba(16, 20, 49, 0.95); color: #ecf2ff;
        border: 1px solid rgba(109, 134, 214, 0.44); border-radius: 10px;
        padding: 8px 30px 8px 12px; font-weight: 700; font-size: 14px; cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2379d6ff' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 12px center;
      }
      .legal-sections[dir="rtl"] { text-align: right; }
      @media (max-width: 560px) {
        .shell { padding-left: 16px; padding-right: 16px; }
        .topbar { flex-direction: column; }
        .navlinks .btn { flex: 1 1 0; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <nav class="topbar" aria-label="Page navigation">
        <a class="btn" href="/">Home</a>
        <div class="navlinks">
          <a class="btn" href="/support.html">Support</a>
          <a class="btn" href="/terms.html">Terms</a>
          <a class="btn" href="/privacy.html">Privacy</a>
        </div>
      </nav>
      <div class="langbar">
        <label class="langpicker">
          <span>Language</span>
          <select id="legal-lang" aria-label="Select language"></select>
        </label>
      </div>
      <header>
        <h1 id="legal-title">${fallbackTitle}</h1>
        <p class="muted" id="legal-updated"></p>
      </header>
      <div class="legal-sections" id="legal-sections"></div>
      <div class="links">
        <a class="btn" href="/">Home</a>
        <a class="btn" href="/support.html">Support</a>
        <a class="btn" href="/terms.html">Terms</a>
        <a class="btn" href="/privacy.html">Privacy</a>
      </div>
    </main>
    <script>
      (function () {
        var DATA = ${payload};
        var STORAGE_KEY = "legal-doc-language";
        function esc(s) {
          return String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        function known(code) {
          return DATA.languages.some(function (l) { return l.code === code; });
        }
        function getLang() {
          try {
            var s = localStorage.getItem(STORAGE_KEY);
            if (known(s)) return s;
          } catch (e) {}
          return "en";
        }
        var select = document.getElementById("legal-lang");
        DATA.languages.forEach(function (l) {
          var o = document.createElement("option");
          o.value = l.code;
          o.textContent = l.label;
          select.appendChild(o);
        });
        function render(lang) {
          var doc = DATA.docs[lang] || DATA.docs.en;
          var entry = DATA.languages.filter(function (l) { return l.code === lang; })[0] || { dir: "ltr" };
          document.documentElement.lang = lang;
          document.getElementById("legal-title").textContent = doc.title;
          document.getElementById("legal-updated").textContent = doc.lastUpdatedLabel + ": " + DATA.lastUpdated;
          var box = document.getElementById("legal-sections");
          box.setAttribute("dir", entry.dir || "ltr");
          box.innerHTML = doc.sections.map(function (s) {
            var body = (s.body || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
            var list = s.list ? "<ul>" + s.list.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "";
            return '<section class="card"><h2>' + esc(s.heading) + "</h2>" + body + list + "</section>";
          }).join("");
        }
        var current = getLang();
        select.value = current;
        render(current);
        select.addEventListener("change", function () {
          var lang = select.value;
          try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
          render(lang);
        });
      })();
    </script>
  </body>
</html>
`;
};

async function writeStaticLegalPage(slug, title, body) {
  const html = staticPageChrome(title, body);
  await rm(join(webDir, slug), { recursive: true, force: true });
  await mkdir(join(webDir, slug), { recursive: true });
  await writeFile(join(webDir, slug, "index.html"), html);
  await writeFile(join(webDir, `${slug}.html`), html);
}

async function writeStaticLegalHtml(slug, html) {
  await rm(join(webDir, slug), { recursive: true, force: true });
  await mkdir(join(webDir, slug), { recursive: true });
  await writeFile(join(webDir, slug, "index.html"), html);
  await writeFile(join(webDir, `${slug}.html`), html);
}

const legal = await loadLegalData();
await writeStaticLegalHtml(
  "terms",
  legalPageHtml("terms", "Terms of Service", legal.terms, legal.languages, legal.lastUpdated),
);
await writeStaticLegalHtml(
  "privacy",
  legalPageHtml("privacy", "Privacy Policy", legal.privacy, legal.languages, legal.lastUpdated),
);
await writeStaticLegalPage("support", "Support", supportBody);
console.log("Wrote static legal/support pages for /terms, /privacy, and /support");
