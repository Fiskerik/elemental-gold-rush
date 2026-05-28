import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_DIR = join(process.cwd(), "screenshots", "store");
const STORAGE_KEY = "elemental-gold-rush";
const SAVED_RUN_STORAGE_KEY = "elemental-gold-rush-saved-run";

const iphone = { width: 430, height: 932 };
const ipad = { width: 1024, height: 1366 };

const devices = [
  { prefix: "iphone", viewport: iphone, deviceScaleFactor: 3 },
  { prefix: "ipad", viewport: ipad, deviceScaleFactor: 2 },
];

const sharedState = {
  appTheme: "dark",
  shootingStyle: "hold",
  hasChosenShootingStyle: true,
  unlockedLevel: 10,
  highestElement: 10,
  discoveredElements: range(1, 10),
  discoveredCompounds: ["water", "oxygen-gas", "hydrogen-gas", "ammonia", "ammonium"],
  compoundCounts: {
    water: 4,
    "oxygen-gas": 3,
    "hydrogen-gas": 3,
    ammonia: 1,
    ammonium: 1,
  },
  earnedBadges: ["first-row-complete", "full-period-2"],
  totalScore: 18450,
  goldCoins: 14,
  levelStars: {
    1: 3,
    2: 3,
    3: 3,
    4: 2,
    5: 3,
    6: 2,
    7: 2,
    8: 1,
    9: 2,
  },
  levelStats: {
    1: { attempts: 1, fails: 0, maxScore: 2200, bestShots: 5, powerUpsUsed: 0, totalScore: 2200, stars: 3 },
    2: { attempts: 1, fails: 0, maxScore: 2150, bestShots: 6, powerUpsUsed: 0, totalScore: 2150, stars: 3 },
    3: { attempts: 2, fails: 1, maxScore: 1980, bestShots: 7, powerUpsUsed: 0, totalScore: 2640, stars: 3 },
    4: { attempts: 1, fails: 0, maxScore: 1880, bestShots: 7, powerUpsUsed: 0, totalScore: 1880, stars: 2 },
    5: { attempts: 2, fails: 1, maxScore: 2480, bestShots: 8, powerUpsUsed: 0, totalScore: 3200, stars: 3 },
    6: { attempts: 2, fails: 1, maxScore: 2750, bestShots: 11, powerUpsUsed: 0, totalScore: 3600, stars: 2 },
    7: { attempts: 1, fails: 0, maxScore: 3020, bestShots: 11, powerUpsUsed: 0, totalScore: 3020, stars: 2 },
    8: { attempts: 3, fails: 1, maxScore: 3420, bestShots: 12, powerUpsUsed: 1, totalScore: 5400, stars: 1 },
    9: { attempts: 2, fails: 1, maxScore: 3650, bestShots: 12, powerUpsUsed: 1, totalScore: 5080, stars: 2 },
    10: { attempts: 1, fails: 0, maxScore: 0, bestShots: null, powerUpsUsed: 0, totalScore: 0, stars: 0 },
  },
  dailyStreak: 3,
  claimedDailyReward: false,
  hasProPack: false,
};

const scenes = [
  {
    key: "gameplay",
    state: {
      ...sharedState,
      unlockedLevel: 10,
      highestElement: 10,
      totalScore: 18450,
      goldCoins: 14,
    },
    savedRun: createCarbonRunSnapshot(),
    goto: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Continue Run" }).click();
      await page.waitForTimeout(1600);
    },
  },
  {
    key: "map",
    state: sharedState,
    goto: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: "Map" }).click();
      await page.waitForTimeout(900);
    },
  },
  {
    key: "library",
    state: sharedState,
    goto: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: "Library" }).click();
      await page.waitForTimeout(900);
    },
  },
  {
    key: "collection",
    state: sharedState,
    goto: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: "Collection" }).click();
      await page.waitForTimeout(800);
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(250);
    },
  },
];

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const device of devices) {
    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
    });
    try {
      for (const scene of scenes) {
        await captureSceneFrame(
          context,
          scene,
          join(OUTPUT_DIR, `${device.prefix}_${scene.key}.png`),
        );
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`Generated iPhone and iPad store screenshots in ${OUTPUT_DIR}`);

async function captureSceneFrame(context, scene, outputPath) {
  const page = await context.newPage();
  try {
    await applyDemoState(page, scene.state, scene.savedRun);
    await scene.goto(page);
    await page.evaluate(() => {
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("theme-dark");
      document.documentElement.style.colorScheme = "dark";
    });

    await page.addStyleTag({
      content: `
        html, body, #root, .app-shell {
          scrollbar-width: none !important;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        #root::-webkit-scrollbar,
        .app-shell::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `,
    });

    await page.screenshot({ path: outputPath });
  } finally {
    await page.close();
  }
}

async function applyDemoState(page, statePatch, savedRun) {
  await page.addInitScript(
    ({ storageKey, statePatch, savedRunStorageKey, savedRun }) => {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const baseState =
        parsed && typeof parsed === "object" && parsed.state && typeof parsed.state === "object"
          ? parsed.state
          : parsed && typeof parsed === "object"
            ? parsed
            : {};
      const nextState = { ...baseState, ...statePatch };

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          state: nextState,
          version: 0,
        }),
      );

      if (savedRun) {
        window.localStorage.setItem(savedRunStorageKey, JSON.stringify(savedRun));
      } else {
        window.localStorage.removeItem(savedRunStorageKey);
      }
    },
    {
      storageKey: STORAGE_KEY,
      statePatch,
      savedRunStorageKey: SAVED_RUN_STORAGE_KEY,
      savedRun,
    },
  );
}

function createCarbonRunSnapshot() {
  return {
    version: 1,
    savedAt: Date.now(),
    levelId: 9,
    mode: "campaign",
    balls: [
      makeBall(1, 64, 118, 1),
      makeBall(2, 122, 116, 2),
      makeBall(3, 182, 126, 3),
      makeBall(4, 244, 118, 4),
      makeBall(5, 306, 130, 5),
      makeBall(6, 92, 188, 2),
      makeBall(7, 154, 196, 1),
      makeBall(8, 216, 188, 4),
      makeBall(9, 276, 198, 3),
      makeBall(10, 188, 258, 5),
    ],
    queue: [1, 2, 3, 4],
    shimmerQueue: [false, false, false, false],
    eGunQueue: [false, false, false, false],
    blankQueue: [false, false, false, false],
    unstableQueue: [false, false, false, false],
    score: 4280,
    highest: 5,
    shots: 11,
    runBestCombo: 3,
    earnedStars: 0,
    elapsedMs: 54000,
    grabs: 1,
    grabProgress: 6,
    compoundCharges: 1,
    inventoryCompoundCharges: 0,
    gravityCharges: 0,
    emissionCharges: 0,
    emissionUnlockIndex: 0,
    transmuteCharges: 0,
    fusionJumpCharges: 0,
    fusionJumpArmed: false,
    catalystCharges: 0,
    catalystShotsRemaining: 0,
    queueShuffleCharges: 0,
    stoneHitTally: 0,
    gammaCharges: 0,
    pendingGamma: false,
    pendingStone: false,
    noMergeStreak: 0,
    stoneSpawnCount: 0,
    spawnFloorIndex: 0,
    continuingPastTarget: false,
    continueStartedElapsedMs: null,
    newlyDiscoveredThisRun: [5],
    runPowerUpsUsed: 0,
  };
}

function makeBall(id, x, y, atom) {
  return { id, x, y, atom, r: 18 };
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
