import { mkdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_DIR = join(process.cwd(), "screenshots", "store");

const iphone = { width: 390, height: 844 };
const ipad = { width: 1024, height: 1366 };

const scenes = [
  {
    key: "menu",
    caption: ["Build the Universe", "One Atom at a Time"],
    bg: ["#1f1c6e", "#7a3f98"],
    goto: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
    },
  },
  {
    key: "collection",
    caption: ["Collect Every Element", "118 Elements to Unlock"],
    bg: ["#2f1468", "#8b469d"],
    goto: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: "Collection" }).click();
      await page.waitForTimeout(900);
    },
  },
  {
    key: "library",
    caption: ["Master the Power-Ups", "12 Tools Endless Combos"],
    bg: ["#0f6a39", "#7b8f23"],
    goto: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: "Library" }).click();
      await page.waitForTimeout(900);
    },
  },
];

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

try {
  for (const scene of scenes) {
    const phoneFrame = await captureSceneFrame(context, scene, iphone, {
      discoveredElements: 42,
      unlockedLevel: 18,
      goldCoins: 24,
    });
    await composeScreenshot(context, {
      outputPath: join(OUTPUT_DIR, `iphone_${scene.key}.png`),
      framePath: phoneFrame,
      outputSize: { width: 1290, height: 2796 },
      caption: scene.caption,
      bg: scene.bg,
      device: "iphone",
    });
    await unlink(phoneFrame).catch(() => {});

    const ipadFrame = await captureSceneFrame(context, scene, ipad, {
      discoveredElements: 64,
      unlockedLevel: 30,
      goldCoins: 51,
    });
    await composeScreenshot(context, {
      outputPath: join(OUTPUT_DIR, `ipad_${scene.key}.png`),
      framePath: ipadFrame,
      outputSize: { width: 2064, height: 2752 },
      caption: scene.caption,
      bg: scene.bg,
      device: "ipad",
    });
    await unlink(ipadFrame).catch(() => {});
  }
} finally {
  await context.close();
  await browser.close();
}

console.log(`Generated store screenshots in ${OUTPUT_DIR}`);

async function captureSceneFrame(context, scene, viewport, demoState) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  const tmpFramePath = join(
    OUTPUT_DIR,
    `.tmp-${scene.key}-${viewport.width}x${viewport.height}.png`,
  );
  try {
    await applyDemoState(page, demoState);
    await scene.goto(page);
    await page.evaluate(() => {
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("theme-dark");
      document.documentElement.style.colorScheme = "dark";
    });
    await page.waitForTimeout(120);

    await page.addStyleTag({
      content: `
        html, body, #root, .app-shell {
          scrollbar-width: none !important;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar, #root::-webkit-scrollbar, .app-shell::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `,
    });

    if (scene.key === "collection") {
      await page.mouse.wheel(0, 280);
      await page.waitForTimeout(250);
    }

    const shell = page.locator(".app-shell");
    await shell.screenshot({ path: tmpFramePath });
    return tmpFramePath;
  } finally {
    await page.close();
  }
}

async function composeScreenshot(
  context,
  { outputPath, framePath, outputSize, caption, bg, device },
) {
  const frameBuffer = await readFile(framePath);
  const frameDataUrl = `data:image/png;base64,${frameBuffer.toString("base64")}`;
  const page = await context.newPage();
  await page.setViewportSize(outputSize);
  try {
    const frameWidth = device === "iphone" ? 1020 : 1780;
    const corner = device === "iphone" ? 110 : 70;
    const inset = device === "iphone" ? 26 : 20;
    const captionTop = device === "iphone" ? 250 : 220;
    const frameBottom = device === "iphone" ? 110 : 95;

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            :root { color-scheme: dark; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              width: 100vw;
              height: 100vh;
              overflow: hidden;
              font-family: Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: linear-gradient(180deg, ${bg[0]} 0%, ${bg[1]} 100%);
              color: #e9eefb;
            }
            .caption {
              position: absolute;
              left: 50%;
              top: ${captionTop}px;
              transform: translateX(-50%);
              text-align: center;
              width: 80%;
              line-height: 1.15;
            }
            .caption h1 {
              margin: 0;
              font-size: ${device === "iphone" ? 108 : 92}px;
              font-weight: 900;
              letter-spacing: 0;
              color: #ffffff;
              text-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
            }
            .caption p {
              margin: 20px 0 0;
              font-size: ${device === "iphone" ? 52 : 44}px;
              font-weight: 600;
              color: rgba(237, 245, 255, 0.92);
            }
            .frame {
              position: absolute;
              left: 50%;
              bottom: ${frameBottom}px;
              width: ${frameWidth}px;
              transform: translateX(-50%);
              border-radius: ${corner}px ${corner}px 0 0;
              background: #06070f;
              box-shadow: 0 28px 64px rgba(0, 0, 0, 0.5);
              padding: ${inset}px ${inset}px 0 ${inset}px;
              overflow: hidden;
            }
            .frame img {
              width: 100%;
              display: block;
              border-radius: ${Math.max(corner - inset, 8)}px ${Math.max(corner - inset, 8)}px 0 0;
            }
          </style>
        </head>
        <body>
          <section class="caption">
            <h1>${caption[0]}</h1>
            <p>${caption[1]}</p>
          </section>
          <section class="frame">
            <img src="${frameDataUrl}" alt="Elemental Gold Rush ${caption[0]}" />
          </section>
        </body>
      </html>
    `);
    await page.screenshot({ path: outputPath });
  } finally {
    await page.close();
  }
}

async function applyDemoState(page, { discoveredElements, unlockedLevel, goldCoins }) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ discoveredElements, unlockedLevel, goldCoins }) => {
      const key = "elemental-gold-rush";
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      const state = parsed?.state && typeof parsed.state === "object" ? parsed.state : parsed;
      state.appTheme = "dark";
      state.discoveredElements = Array.from(
        { length: Math.max(1, Math.min(118, discoveredElements)) },
        (_, i) => i + 1,
      );
      state.unlockedLevel = Math.max(1, Math.min(62, unlockedLevel));
      state.goldCoins = Math.max(0, goldCoins);
      state.highestElement = state.discoveredElements[state.discoveredElements.length - 1] ?? 1;
      state.hasProPack = true;
      localStorage.setItem(key, JSON.stringify(state));
    },
    { discoveredElements, unlockedLevel, goldCoins },
  );
}
