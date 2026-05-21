import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const clientDir = join(process.cwd(), "dist", "client");
const assetsDir = join(clientDir, "assets");
const assets = await readdir(assetsDir);
const css = assets.find((name) => /^styles-.*\.css$/.test(name));
let entry = null;

for (const asset of assets.filter((name) => /^index-.*\.js$/.test(name))) {
  const source = await readFile(join(assetsDir, asset), "utf8");
  if (source.includes("hydrateRoot(document")) {
    entry = asset;
    break;
  }
}

if (!entry) {
  throw new Error("Could not find the TanStack Start browser entry for Capacitor.");
}

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Elemental Gold Rush</title>
    ${css ? `<link rel="stylesheet" href="/assets/${css}" />` : ""}
    <script type="module" src="/assets/${entry}"></script>
  </head>
  <body></body>
</html>
`;

await writeFile(join(clientDir, "index.html"), indexHtml);
console.log(`Wrote Capacitor index.html using ${entry}`);
