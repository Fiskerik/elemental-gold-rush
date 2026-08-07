import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { createServer } from "vite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectDirectory, "marketing", "tiktok-slideshow");
const outputPath = path.join(outputDirectory, "powerup-icon-showcase.png");
const browserExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const powerUps = [
  ["grab", "Grab"],
  ["gravity", "Gravity"],
  ["transmute", "Transmute"],
  ["egun", "E-Gun"],
  ["gamma", "Gamma Bomb"],
  ["molecule", "Compound"],
];

await mkdir(outputDirectory, { recursive: true });

const vite = await createServer({
  root: projectDirectory,
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { PowerUpBadge } = await vite.ssrLoadModule("/src/game/PowerUpLibrary.tsx");
  const showcase = React.createElement(
    "div",
    {
      style: {
        width: 760,
        height: 620,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        gap: 12,
        padding: 26,
      },
    },
    powerUps.map(([icon, name]) =>
      React.createElement(
        "div",
        {
          key: icon,
          style: {
            display: "grid",
            justifyItems: "center",
            alignContent: "center",
            gap: 12,
            borderRadius: 26,
            border: "1px solid rgba(127, 211, 255, 0.2)",
            background: "linear-gradient(145deg, rgba(18, 33, 74, 0.88), rgba(5, 10, 30, 0.84))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 20px rgba(0,0,0,0.28)",
          },
        },
        React.createElement(PowerUpBadge, { icon, size: 132 }),
        React.createElement(
          "span",
          {
            style: {
              color: "#F7FBFF",
              fontFamily: "Arial, sans-serif",
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1,
              textAlign: "center",
            },
          },
          name,
        ),
      ),
    ),
  );

  const browser = await chromium.launch({ headless: true, executablePath: browserExecutablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 760, height: 620 }, deviceScaleFactor: 2 });
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;background:transparent}*{box-sizing:border-box}</style></head><body>${renderToStaticMarkup(showcase)}</body></html>`,
      { waitUntil: "networkidle" },
    );
    await page.screenshot({ path: outputPath, omitBackground: true });
  } finally {
    await browser.close();
  }
} finally {
  await vite.close();
}

console.log(`Rendered power-up showcase to ${outputPath}`);
