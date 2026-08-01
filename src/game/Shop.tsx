import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Clapperboard } from "lucide-react";
import { ElementBall } from "./ElementBall";
import { type AtomSkin, type BoardTheme, type InventoryPowerUpId, useProgress } from "./store";
import { POWER_UP_UNLOCK_LEVELS } from "./powerUps";
import { PowerUpBadge } from "./PowerUpLibrary";
import {
  COSMETIC_THEME_PURCHASES_ENABLED,
  PRODUCT_IDS,
  THEME_BUNDLE_PRODUCT_IDS,
  getProductById,
  type ProductDefinition,
  type ProductId,
} from "./products";
import {
  clearCustomerInfoListener,
  debugNativePurchases,
  isPurchaseDebugUiEnabled,
  purchaseGoldCoinPack,
  purchaseProductWithResult,
  redeemOfferCode,
  restorePurchases,
  setCustomerInfoListener,
} from "./purchases";
import { initAds, showRewardedForCoin } from "./ads";
import { useIsTabletLayout } from "./responsive";
import { clearLogs, copyDebugReport, getDebugReport, getLogs, logDebug } from "../lib/debugLogger";

const SHOP_POWER_UPS: Array<{
  id: InventoryPowerUpId;
  name: string;
  coinCost: number;
  unlockLevel: number;
  description: string;
}> = [
  {
    id: "transmute",
    name: "Transmute Shot",
    coinCost: 6,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.transmute,
    description: "Reroll the loaded atom into a higher tier at the start of a run.",
  },
  {
    id: "fusion-jump",
    name: "Fusion Jump",
    coinCost: 6,
    unlockLevel: POWER_UP_UNLOCK_LEVELS["fusion-jump"],
    description: "Save a tier-skipping merge for a future level opening.",
  },
  {
    id: "catalyst",
    name: "Catalyst Aura",
    coinCost: 12,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.catalyst,
    description: "Start a level with 5 shots of wider fusion radius available.",
  },
  {
    id: "emission",
    name: "Emission",
    coinCost: 15,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.emission,
    description: "Raise your starting queue when a level needs a quick push.",
  },
  {
    id: "gravity",
    name: "Gravity",
    coinCost: 12,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.gravity,
    description: "Bank a board-lifting move for a difficult future board.",
  },
  {
    id: "grab",
    name: "Grab",
    coinCost: 12,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.grab,
    description: "Bring a saved reposition move into your next level.",
  },
  {
    id: "gamma",
    name: "Gamma Bomb",
    coinCost: 12,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.gamma,
    description: "Stock a wide-radius blast that clears surrounding non-stone atoms.",
  },
  {
    id: "molecule",
    name: "Compound",
    coinCost: 15,
    unlockLevel: 1,
    description: "Compound is available at the start of every campaign run.",
  },
];

const SHOP_POWER_UPS_BY_PRICE = [...SHOP_POWER_UPS].sort(
  (a, b) =>
    a.coinCost - b.coinCost || a.unlockLevel - b.unlockLevel || a.name.localeCompare(b.name),
);

const APP_STORE_COIN_PACKS = [
  PRODUCT_IDS.coins5,
  PRODUCT_IDS.coins20,
  PRODUCT_IDS.coins50,
  PRODUCT_IDS.coins100,
] as const;
type ThemeBundleVisual = {
  board: string;
  atom: string;
  skin: string;
  theme: BoardTheme;
  atomSkins: AtomSkin[];
};

const THEME_BUNDLE_VISUALS: Partial<Record<ProductId, ThemeBundleVisual>> = {
  [PRODUCT_IDS.themeGoldLab]: {
    board: "url('/themes/gummy-lab.webp') center / cover no-repeat",
    atom:
      "linear-gradient(132deg, transparent 32%, rgba(255,255,255,.75) 34%, transparent 39%), radial-gradient(circle at 30% 25%, #ffe5a1, #d26c32 58%, #4d1e1e)",
    skin: "Gummy atoms",
    theme: "goldLab",
    atomSkins: ["chrome"],
  },
  [PRODUCT_IDS.themeNeonPeriodic]: {
    board: "url('/themes/cloud-nine.webp') center / cover no-repeat",
    atom:
      "linear-gradient(165deg, rgba(88,239,255,.35), transparent 42%, rgba(238,92,255,.3)), radial-gradient(circle at 30% 25%, #ffe5a1, #d26c32 58%, #4d1e1e)",
    skin: "Cloud Glass atoms",
    theme: "neonPeriodic",
    atomSkins: ["hologram"],
  },
  [PRODUCT_IDS.themeQuantumVoid]: {
    board: "url('/themes/crystal-cove.webp') center / cover no-repeat",
    atom:
      "conic-gradient(from 25deg, transparent, rgba(255,255,255,.42), transparent 28% 62%, rgba(255,255,255,.28), transparent 78%), radial-gradient(circle at 30% 25%, #ffe5a1, #d26c32 58%, #4d1e1e)",
    skin: "Crystal Core + Mineral atoms",
    theme: "quantumVoid",
    atomSkins: ["crystal", "mineral"],
  },
  [PRODUCT_IDS.themeVerdantCrystal]: {
    board:
      "radial-gradient(circle at 14% 5%, rgba(255,255,255,.9), transparent 24%), radial-gradient(circle at 88% 24%, rgba(105,224,170,.42), transparent 32%), linear-gradient(180deg, #effff7, #a9e8cb 58%, #397e72)",
    atom:
      "linear-gradient(55deg, transparent 42%, rgba(255,255,255,.72) 44% 48%, transparent 50%), radial-gradient(circle at 28% 20%, #ffffff, #65cda7 58%, #1c5e56)",
    skin: "Verdant Glass atoms",
    theme: "verdantCrystal",
    atomSkins: ["verdantCrystal"],
  },
  [PRODUCT_IDS.themeBiohazard]: {
    board: "url('/themes/radioactive-reactor.webp') center / cover no-repeat",
    atom:
      "radial-gradient(circle at 68% 66%, rgba(255,255,255,.5) 0 7%, transparent 8%), radial-gradient(circle at 42% 72%, rgba(255,255,255,.35) 0 5%, transparent 6%), radial-gradient(circle at 30% 25%, #ffe5a1, #d26c32 58%, #4d1e1e)",
    skin: "Irradiated atoms",
    theme: "biohazard",
    atomSkins: ["toxic"],
  },
};

const THEME_PREVIEW_ATOMS = [1, 6, 8, 10, 14, 17, 26, 79];
const THEME_PREVIEW_POSITIONS = [
  [12, 14],
  [36, 9],
  [67, 16],
  [86, 31],
  [22, 42],
  [52, 36],
  [76, 57],
  [16, 72],
  [48, 68],
] as const;
const SHOP_PURCHASE_GUARD_TIMEOUT_MS = 60_000;

function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: number | undefined;
  return Promise.race([
    Promise.resolve()
      .then(operation)
      .finally(() => {
        if (timeoutId) window.clearTimeout(timeoutId);
      }),
    new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function BundlePreview({
  visual,
}: {
  visual: ThemeBundleVisual;
}) {
  return (
    <div
      aria-label={`${visual.skin} preview with eight atoms`}
      style={{
        position: "absolute",
        inset: 0,
        background:
          visual.theme === "quantumVoid"
            ? "linear-gradient(180deg, transparent 0 58%, rgba(20,100,116,.42) 59% 100%)"
            : "linear-gradient(180deg, transparent 0 56%, rgba(0,0,0,.22) 57% 100%)",
      }}
    >
      {THEME_PREVIEW_ATOMS.map((atomicNumber, index) => {
        const atomSkin = visual.atomSkins[index % visual.atomSkins.length] ?? "classic";
        const positions = [
          [9, 12],
          [39, 7],
          [70, 14],
          [23, 43],
          [54, 38],
          [83, 46],
          [8, 72],
          [62, 70],
        ][index];
        return (
          <div
            key={`${atomicNumber}-${index}`}
            style={{
              position: "absolute",
              left: `${positions[0]}%`,
              top: `${positions[1]}%`,
              transform: "translate(-50%, -50%)",
              filter: "drop-shadow(0 3px 4px rgba(0,0,0,.38))",
            }}
          >
            <ElementBall
              atomicNumber={atomicNumber}
              size={30}
              glow={index % 3 === 0}
              atomSkin={atomSkin}
              patternSeed={index + 101}
            />
          </div>
        );
      })}
    </div>
  );
}

type PreviewBoardAtom = {
  id: string;
  atomicNumber: number;
  x: number;
  y: number;
  atomSkin: AtomSkin;
};

function makePreviewAtoms(visual: ThemeBundleVisual): PreviewBoardAtom[] {
  return THEME_PREVIEW_POSITIONS.map(([x, y], index) => ({
    id: `initial-${index}`,
    atomicNumber: THEME_PREVIEW_ATOMS[index % THEME_PREVIEW_ATOMS.length],
    x,
    y,
    atomSkin: visual.atomSkins[index % visual.atomSkins.length] ?? "classic",
  }));
}

function ThemePreviewModal({
  product,
  visual,
  onClose,
}: {
  product: ProductDefinition;
  visual: ThemeBundleVisual;
  onClose: () => void;
}) {
  const [atoms, setAtoms] = useState(() => makePreviewAtoms(visual));
  const [shotsUsed, setShotsUsed] = useState(0);

  function resetPreview() {
    setAtoms(makePreviewAtoms(visual));
    setShotsUsed(0);
  }

  function shootAt(x: number, y: number) {
    if (shotsUsed >= 10) return;
    const shotIndex = shotsUsed;
    setAtoms((current) => [
      ...current,
      {
        id: `shot-${shotIndex}`,
        atomicNumber: THEME_PREVIEW_ATOMS[(shotIndex + 3) % THEME_PREVIEW_ATOMS.length],
        x,
        y,
        atomSkin: visual.atomSkins[(shotIndex + current.length) % visual.atomSkins.length] ?? "classic",
      },
    ]);
    setShotsUsed((current) => current + 1);
  }

  function handleBoardClick(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(10, Math.min(82, ((event.clientY - bounds.top) / bounds.height) * 100));
    shootAt(x, y);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-preview-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        padding: 16,
        display: "grid",
        placeItems: "center",
        overflowY: "auto",
        background: "rgba(3, 5, 18, .78)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(100%, 560px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          padding: 16,
          borderRadius: 20,
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 70px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: 2, fontWeight: 900 }}>
              THEME PREVIEW
            </div>
            <h2 id="theme-preview-title" style={{ margin: "4px 0 2px", fontSize: 22 }}>
              {product.name}
            </h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 12 }}>
              {visual.skin} · Tap the board to shoot
            </p>
          </div>
          <button type="button" onClick={onClose} style={smallButton}>
            Close
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            margin: "14px 0 10px",
            padding: "9px 11px",
            borderRadius: 11,
            background: "var(--surface)",
            color: "var(--foreground)",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <span>{shotsUsed >= 10 ? "Preview complete" : "10-shot test board"}</span>
          <span style={{ color: shotsUsed >= 10 ? "var(--success)" : "var(--accent)" }}>
            {10 - shotsUsed} shots left
          </span>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label={shotsUsed >= 10 ? "Theme preview complete" : "Shoot a test atom"}
          onClick={handleBoardClick}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && shotsUsed < 10) {
              event.preventDefault();
              shootAt(50, 78);
            }
          }}
          style={{
            position: "relative",
            minHeight: "min(62vh, 520px)",
            borderRadius: 18,
            overflow: "hidden",
            cursor: shotsUsed >= 10 ? "default" : "crosshair",
            background: `${visual.board}, linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.2))`,
            border: "1px solid rgba(255,255,255,.3)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,.22), inset 0 -80px 120px rgba(0,0,0,.18)",
          }}
        >
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.12), transparent 28%, rgba(0,0,0,.12))", pointerEvents: "none" }} />
          {atoms.map((atom) => (
            <div
              key={atom.id}
              style={{
                position: "absolute",
                left: `${atom.x}%`,
                top: `${atom.y}%`,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                filter: "drop-shadow(0 4px 5px rgba(0,0,0,.4))",
                animation: atom.id.startsWith("shot-") ? "pop-in 260ms ease-out" : undefined,
              }}
            >
              <ElementBall
                atomicNumber={atom.atomicNumber}
                size={46}
                glow={atom.id.endsWith("0") || atom.id.endsWith("3")}
                atomSkin={atom.atomSkin}
                patternSeed={atom.id.length + atom.atomicNumber}
              />
            </div>
          ))}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 14,
              transform: "translateX(-50%)",
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: "var(--foreground)",
              background: "radial-gradient(circle at 30% 24%, rgba(255,255,255,.8), rgba(80,160,240,.75) 42%, rgba(20,35,85,.95))",
              border: "2px solid rgba(255,255,255,.65)",
              boxShadow: "0 0 18px rgba(100,190,255,.55)",
              fontSize: 10,
              fontWeight: 900,
            }}
          >
            SHOOT
          </div>
          {shotsUsed >= 10 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(4,8,24,.52)",
                color: "white",
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              Preview complete
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={resetPreview} style={{ ...secondaryShopButton, flex: 1 }}>
            Reset preview
          </button>
          <button type="button" onClick={onClose} style={{ ...shopButton, flex: 1 }}>
            Back to shop
          </button>
        </div>
      </div>
    </div>
  );
}

export function Shop({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const {
    goldCoins,
    unlockedLevel,
    powerUpInventory,
    grantGoldCoins,
    grantProPack,
    reportQuestProgress,
    purchaseInventoryPowerUp,
    hasProPack,
    ownedThemeProducts,
    grantThemeProduct,
    recordShopSpend,
  } = useProgress();
  const [message, setMessage] = useState("");
  const [pendingProductId, setPendingProductId] = useState<ProductId | "rewarded" | null>(null);
  const [previewProductId, setPreviewProductId] = useState<ProductId | null>(null);
  const [proPackMessage, setProPackMessage] = useState("");
  const [cosmeticMessage, setCosmeticMessage] = useState("");
  const [proPackBusy, setProPackBusy] = useState<"purchase" | "restore" | "redeem" | "">("");
  const [purchaseDebugBusy, setPurchaseDebugBusy] = useState(false);
  const [purchaseDebugOpen, setPurchaseDebugOpen] = useState(false);
  const [purchaseDebugLogs, setPurchaseDebugLogs] = useState<string[]>([]);
  const [purchaseSupportBusy, setPurchaseSupportBusy] = useState(false);
  const [purchaseSupportMessage, setPurchaseSupportMessage] = useState("");
  const [purchaseReport, setPurchaseReport] = useState("");
  const [coinToast, setCoinToast] = useState<{ id: number; text: string } | null>(null);
  const coinToastTimeoutRef = useRef<number | null>(null);
  const proPack = getProductById(PRODUCT_IDS.proLabPack);
  const isNativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  const purchaseDebugEnabled = isPurchaseDebugUiEnabled();
  const purchaseDebugLocked = purchaseDebugEnabled && purchaseDebugBusy;
  const appStorePurchaseBusy = Boolean(proPackBusy) || Boolean(pendingProductId);
  const previewProduct = previewProductId ? getProductById(previewProductId) : undefined;
  const previewVisual = previewProductId ? THEME_BUNDLE_VISUALS[previewProductId] : undefined;
  const showPurchaseSupport =
    isNativeIos &&
    purchaseDebugEnabled &&
    Boolean(proPackMessage || message || purchaseSupportMessage || purchaseReport);

  useEffect(() => {
    if (!isNativeIos) return;
    if (hasProPack) return;
    void initAds(false);
  }, [hasProPack, isNativeIos]);

  useEffect(() => {
    if (!isNativeIos || hasProPack) return;
    let active = true;
    void setCustomerInfoListener((hasEntitlement) => {
      if (!active || !hasEntitlement) return;
      grantProPack();
      setProPackMessage("Pro Lab Pack unlocked from offer code.");
    });
    return () => {
      active = false;
      void clearCustomerInfoListener();
    };
  }, [grantProPack, hasProPack, isNativeIos]);

  useEffect(
    () => () => {
      if (coinToastTimeoutRef.current !== null) {
        window.clearTimeout(coinToastTimeoutRef.current);
      }
    },
    [],
  );

  function showCoinToast(text: string) {
    const id = Date.now();
    if (coinToastTimeoutRef.current !== null) {
      window.clearTimeout(coinToastTimeoutRef.current);
    }
    setCoinToast({ id, text });
    coinToastTimeoutRef.current = window.setTimeout(() => {
      setCoinToast((current) => (current?.id === id ? null : current));
      coinToastTimeoutRef.current = null;
    }, 1800);
  }

  function refreshPurchaseDebugLogs(open = purchaseDebugOpen) {
    setPurchaseDebugLogs(getLogs());
    if (open) setPurchaseDebugOpen(true);
  }

  function handlePowerUpPurchase(
    powerUp: InventoryPowerUpId,
    coinCost: number,
    name: string,
    unlockLevel: number,
  ) {
    if (unlockedLevel < unlockLevel) {
      setMessage(`${name} is introduced at level ${unlockLevel}.`);
      return;
    }
    const purchased = purchaseInventoryPowerUp(powerUp, coinCost);
    setMessage(
      purchased
        ? `${name} added to your inventory.`
        : `You need ${coinCost} gold coin${coinCost === 1 ? "" : "s"} to buy ${name}.`,
    );
  }

  async function handleProPackPurchase() {
    if (appStorePurchaseBusy) return;
    logDebug("Unlock Pack button tapped.", { productId: PRODUCT_IDS.proLabPack });
    setProPackBusy("purchase");
    setProPackMessage("Preparing purchase with App Store...");
    try {
      const result = await withTimeout(
        () =>
          purchaseProductWithResult(PRODUCT_IDS.proLabPack, (statusMessage) =>
            setProPackMessage(statusMessage),
          ),
        SHOP_PURCHASE_GUARD_TIMEOUT_MS,
        "App Store did not respond in time. Try again.",
      );
      if (result.purchased) {
        grantProPack();
        recordShopSpend(PRODUCT_IDS.proLabPack);
        setProPackMessage("Pro Lab Pack unlocked.");
        return;
      }
      setProPackMessage(result.reason ?? "Pro Lab Pack is not available right now.");
    } catch (error) {
      setProPackMessage(
        error instanceof Error ? error.message : "App Store purchase could not be started.",
      );
    } finally {
      logDebug("Product purchase UI flow ended.", { productId: PRODUCT_IDS.proLabPack });
      setProPackBusy("");
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleProPackRestore() {
    if (appStorePurchaseBusy) return;
    setProPackBusy("restore");
    setProPackMessage("Checking App Store purchases...");
    try {
      const restored = await restorePurchases();
      if (restored.includes(PRODUCT_IDS.proLabPack)) {
        grantProPack();
        setProPackMessage("Pro Lab Pack restored.");
        return;
      }
      setProPackMessage("No Pro Lab Pack purchase was found.");
    } catch (error) {
      setProPackMessage(
        error instanceof Error ? error.message : "Purchases could not be restored.",
      );
    } finally {
      setProPackBusy("");
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleOfferCodeRedeem() {
    if (appStorePurchaseBusy) return;
    setProPackBusy("redeem");
    setProPackMessage("Opening App Store code redemption...");
    try {
      const result = await withTimeout(
        () => redeemOfferCode((statusMessage) => setProPackMessage(statusMessage)),
        SHOP_PURCHASE_GUARD_TIMEOUT_MS,
        "App Store code redemption did not respond in time. Try again.",
      );
      if (result.purchased) {
        grantProPack();
        setProPackMessage("Pro Lab Pack unlocked from offer code.");
        return;
      }
      setProPackMessage(
        result.reason ?? "Offer code redemption could not be completed right now.",
      );
    } catch (error) {
      setProPackMessage(
        error instanceof Error
          ? error.message
          : "App Store code redemption could not be started.",
      );
    } finally {
      setProPackBusy("");
    }
  }

  async function handleNativeCoinPurchase(productId: ProductId) {
    if (appStorePurchaseBusy) return;
    logDebug("Coin pack button tapped.", { productId });
    setPendingProductId(productId);
    setMessage("Preparing purchase with App Store...");
    try {
      const result = await withTimeout(
        () => purchaseGoldCoinPack(productId, (statusMessage) => setMessage(statusMessage)),
        SHOP_PURCHASE_GUARD_TIMEOUT_MS,
        "App Store did not respond in time. Try again.",
      );
      if (result.coins > 0) {
        grantGoldCoins(result.coins, "App Store coin pack");
        recordShopSpend(productId);
        setMessage(
          `${result.coins} gold coin${result.coins === 1 ? "" : "s"} added from App Store purchase.`,
        );
        return;
      }
      setMessage(result.reason ?? "App Store coin purchase is not available right now.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "App Store coin purchase could not be started.",
      );
    } finally {
      logDebug("Coin purchase UI flow ended.", { productId });
      setPendingProductId(null);
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleThemePurchase(productId: ProductId) {
    if (!COSMETIC_THEME_PURCHASES_ENABLED) {
      setCosmeticMessage("All cosmetic themes are free during testing.");
      return;
    }
    if (appStorePurchaseBusy || ownedThemeProducts.includes(productId)) return;
    setPendingProductId(productId);
    setCosmeticMessage("Preparing cosmetic purchase with App Store...");
    try {
      const result = await withTimeout(
        () =>
          purchaseProductWithResult(productId, (statusMessage) =>
            setCosmeticMessage(statusMessage),
          ),
        SHOP_PURCHASE_GUARD_TIMEOUT_MS,
        "App Store did not respond in time. Try again.",
      );
      if (result.purchased) {
        grantThemeProduct(productId);
        recordShopSpend(productId);
        setCosmeticMessage(`${getProductById(productId)?.name ?? "Cosmetic bundle"} unlocked.`);
        return;
      }
      setCosmeticMessage(result.reason ?? "This cosmetic bundle is not available right now.");
    } catch (error) {
      setCosmeticMessage(
        error instanceof Error ? error.message : "App Store purchase could not be started.",
      );
    } finally {
      setPendingProductId(null);
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleThemeRestore() {
    if (appStorePurchaseBusy) return;
    setProPackBusy("restore");
    setCosmeticMessage("Checking App Store purchases...");
    try {
      const restored = await restorePurchases();
      if (restored.includes(PRODUCT_IDS.proLabPack)) grantProPack();
      const restoredThemes = restored.filter((productId) =>
        (THEME_BUNDLE_PRODUCT_IDS as readonly ProductId[]).includes(productId),
      );
      restoredThemes.forEach(grantThemeProduct);
      setCosmeticMessage(
        restoredThemes.length
          ? `${restoredThemes.length} cosmetic bundle${restoredThemes.length === 1 ? "" : "s"} restored.`
          : "No cosmetic bundle purchases were found.",
      );
    } catch (error) {
      setCosmeticMessage(
        error instanceof Error ? error.message : "Purchases could not be restored.",
      );
    } finally {
      setProPackBusy("");
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleRewardedCoin() {
    setPendingProductId("rewarded");
    setMessage("Loading rewarded ad...");
    try {
      const result = await showRewardedForCoin(hasProPack);
      if (result.rewarded) {
        grantGoldCoins(1, "Rewarded ad");
        reportQuestProgress({ adsWatched: 1 });
        setMessage("Reward complete: +1 gold coin.");
        showCoinToast("+1 gold coin");
        return;
      }
      setMessage(
        result.reason ?? "Rewarded ad not completed or not available yet. Try again shortly.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rewarded ad could not be started.");
    } finally {
      setPendingProductId(null);
    }
  }

  async function handlePurchaseDebug() {
    setPurchaseDebugBusy(true);
    setMessage("Checking purchase diagnostics...");
    logDebug("Manual purchase diagnostics started.");
    try {
      const snapshot = await debugNativePurchases((statusMessage) => setMessage(statusMessage));
      const details = [
        `Platform: ${snapshot.platform}`,
        `Configured: ${String(snapshot.isConfigured ?? snapshot.configured)}`,
        `Can make payments: ${String(snapshot.canMakePayments ?? "unknown")}`,
        `Offering: ${snapshot.offeringId}`,
        `Entitlement: ${snapshot.entitlementId}`,
        `Active entitlements: ${snapshot.activeEntitlements.join(", ") || "none"}`,
        `Packages: ${snapshot.packageIdentifiers.join(", ") || "none"}`,
        `Store products: ${snapshot.storeProductIdentifiers.join(", ") || "none"}`,
        snapshot.reason ? `Reason: ${snapshot.reason}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      console.log("RevenueCat diagnostics", snapshot);
      window.alert(details);
      setMessage(snapshot.reason ?? "Purchase diagnostics complete.");
      refreshPurchaseDebugLogs(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logDebug("Manual purchase diagnostics failed.", { message });
      window.alert(`Purchase diagnostics failed.\n\n${message}`);
      setMessage(message);
      refreshPurchaseDebugLogs(true);
    } finally {
      setPurchaseDebugBusy(false);
    }
  }

  function handleClearPurchaseLogs() {
    clearLogs();
    setPurchaseDebugLogs([]);
    setPurchaseReport("");
    setMessage("Purchase debug logs cleared.");
  }

  async function handlePurchaseSupportCheck() {
    setPurchaseSupportBusy(true);
    setPurchaseSupportMessage("Checking purchase setup...");
    logDebug("Manual purchase support check started.");
    try {
      const snapshot = await debugNativePurchases((statusMessage) =>
        setPurchaseSupportMessage(statusMessage),
      );
      setPurchaseSupportMessage(snapshot.reason ?? "Purchase setup check complete.");
      setPurchaseReport(getDebugReport());
    } catch (error) {
      const supportMessage = error instanceof Error ? error.message : String(error);
      logDebug("Manual purchase support check failed.", { message: supportMessage });
      setPurchaseSupportMessage(supportMessage);
      setPurchaseReport(getDebugReport());
    } finally {
      setPurchaseSupportBusy(false);
    }
  }

  async function handleCopyPurchaseDiagnostics() {
    const copied = await copyDebugReport();
    setPurchaseReport(getDebugReport());
    setPurchaseSupportMessage(
      copied
        ? "Purchase diagnostics copied. Paste them into your support note."
        : "Clipboard copy was not available. Select and copy the report below.",
    );
  }

  function handleTogglePurchaseReport() {
    setPurchaseReport((current) => (current ? "" : getDebugReport()));
  }

  return (
    <div
      className="app-shell"
      style={{ padding: isTabletLayout ? 28 : 20, paddingTop: isTabletLayout ? 36 : 32 }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: isTabletLayout ? 980 : 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: isTabletLayout ? 20 : 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={smallButton}>
            ← Back
          </button>
          <div>
            <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>Shop</h1>
          </div>
        </div>
        {message && (
          <p style={{ margin: "-4px 0 0", color: "var(--muted-foreground)", fontSize: 12 }}>
            {message}
          </p>
        )}
        {purchaseDebugEnabled && (
          <section style={debugPanel}>
            <div style={debugActions}>
              <button
                type="button"
                onClick={handlePurchaseDebug}
                disabled={purchaseDebugBusy || Boolean(proPackBusy) || Boolean(pendingProductId)}
                style={{
                  ...secondaryShopButton,
                  opacity: purchaseDebugBusy ? 0.7 : 1,
                }}
              >
                {purchaseDebugBusy ? "Checking..." : "Debug RevenueCat"}
              </button>
              <button
                type="button"
                onClick={() => {
                  refreshPurchaseDebugLogs(true);
                }}
                style={secondaryShopButton}
              >
                Show Logs
              </button>
              <button type="button" onClick={handleClearPurchaseLogs} style={secondaryShopButton}>
                Clear Logs
              </button>
            </div>
            {purchaseDebugOpen && (
              <div style={debugLogBox}>
                {purchaseDebugLogs.length ? (
                  purchaseDebugLogs.map((entry, index) => (
                    <div key={`${index}-${entry}`} style={debugLogLine}>
                      {entry}
                    </div>
                  ))
                ) : (
                  <div style={debugLogLine}>No purchase logs yet.</div>
                )}
              </div>
            )}
          </section>
        )}

        {showPurchaseSupport && (
          <section style={purchaseSupportPanel}>
            <div>
              <div style={purchaseSupportTitle}>Purchase Support</div>
              <p style={purchaseSupportCopy}>
                If the App Store sheet does not appear, run a check and copy diagnostics from this
                TestFlight build.
              </p>
            </div>
            <div style={purchaseSupportActions}>
              <button
                type="button"
                onClick={handlePurchaseSupportCheck}
                disabled={purchaseSupportBusy || Boolean(proPackBusy) || Boolean(pendingProductId)}
                style={{
                  ...secondaryShopButton,
                  opacity:
                    purchaseSupportBusy || Boolean(proPackBusy) || Boolean(pendingProductId)
                      ? 0.6
                      : 1,
                }}
              >
                {purchaseSupportBusy ? "Checking..." : "Run Check"}
              </button>
              <button
                type="button"
                onClick={handleCopyPurchaseDiagnostics}
                style={secondaryShopButton}
              >
                Copy Diagnostics
              </button>
              <button
                type="button"
                onClick={handleTogglePurchaseReport}
                style={secondaryShopButton}
              >
                {purchaseReport ? "Hide Report" : "Show Report"}
              </button>
            </div>
            {purchaseSupportMessage && (
              <p style={purchaseSupportStatus}>{purchaseSupportMessage}</p>
            )}
            {purchaseReport && (
              <textarea
                readOnly
                value={purchaseReport}
                onFocus={(event) => event.currentTarget.select()}
                style={purchaseReportBox}
                aria-label="Purchase diagnostics report"
              />
            )}
          </section>
        )}

        {isNativeIos && proPack && (
          <section
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    color: "var(--accent)",
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  ONE-TIME UPGRADE
                </div>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>{proPack.name}</h2>
              </div>
              <WalletPill
                label="Status"
                value={hasProPack ? "Active" : "Available"}
                accent={hasProPack}
              />
            </div>
            <p
              style={{
                margin: "12px 0 10px",
                color: "var(--muted-foreground)",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              A one-time premium upgrade for long-term progression.
            </p>
            <div style={{ display: "grid", gap: 7, marginBottom: 14 }}>
              <Benefit text="Remove forced interstitial ads." />
              <Benefit text="Unlock the Pro Lab profile badge." />
              <Benefit text="Daily quest claims pay 10 gold coins instead of 3." />
              <Benefit text="Daily challenges award 5 gold coins each instead of 3." />
              <Benefit text="Level 1 upgrade to all power-ups (10 coin refund each for already upgraded)." />
            </div>
            {hasProPack ? (
              <div style={proPackActive}>Pro Lab Pack Active</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleOfferCodeRedeem}
                  disabled={appStorePurchaseBusy || purchaseDebugLocked}
                  style={{
                    ...secondaryShopButton,
                    opacity:
                      purchaseDebugLocked || (appStorePurchaseBusy && proPackBusy !== "redeem")
                        ? 0.55
                        : 1,
                  }}
                >
                  {proPackBusy === "redeem" ? "Opening..." : "Redeem Code"}
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleProPackRestore}
                    disabled={appStorePurchaseBusy || purchaseDebugLocked}
                    style={{
                      ...secondaryShopButton,
                      opacity:
                        purchaseDebugLocked || (appStorePurchaseBusy && proPackBusy !== "restore")
                          ? 0.55
                          : 1,
                    }}
                  >
                    {proPackBusy === "restore" ? "Checking..." : "Restore"}
                  </button>
                  <button
                    type="button"
                    onClick={handleProPackPurchase}
                    disabled={appStorePurchaseBusy || purchaseDebugLocked}
                    style={{
                      ...shopButton,
                      opacity:
                        purchaseDebugLocked || (appStorePurchaseBusy && proPackBusy !== "purchase")
                          ? 0.55
                          : 1,
                    }}
                  >
                    {proPackBusy === "purchase" ? "Opening..." : "Unlock Pack"}
                  </button>
                </div>
              </div>
            )}
            {proPackMessage && (
              <p style={{ margin: "12px 0 0", color: "var(--muted-foreground)", fontSize: 12 }}>
                {proPackMessage}
              </p>
            )}
          </section>
        )}

        {isNativeIos && (
          <section
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    color: "var(--accent)",
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  {COSMETIC_THEME_PURCHASES_ENABLED ? "COSMETIC BUNDLES" : "FREE THEME PREVIEW"}
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
                  Boards + atom skins
                </h2>
              </div>
              {COSMETIC_THEME_PURCHASES_ENABLED && (
                <button
                  type="button"
                  onClick={handleThemeRestore}
                  disabled={appStorePurchaseBusy || purchaseDebugLocked}
                  style={{
                    ...secondaryShopButton,
                    padding: "8px 11px",
                    opacity: appStorePurchaseBusy || purchaseDebugLocked ? 0.55 : 1,
                  }}
                >
                  {proPackBusy === "restore" ? "Checking..." : "Restore"}
                </button>
              )}
            </div>
            <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
              {COSMETIC_THEME_PURCHASES_ENABLED
                ? "Each one-time purchase unlocks a board and its matching atom finish. Element colors and gameplay remain unchanged. Shop support also unlocks Researcher at $5 and Developer at $20."
                : "All board themes and atom finishes are unlocked for testing. Element colors and gameplay remain unchanged."}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTabletLayout
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1fr",
                gap: 10,
              }}
            >
              {THEME_BUNDLE_PRODUCT_IDS.map((productId) => {
                const product = getProductById(productId);
                const visual = THEME_BUNDLE_VISUALS[productId];
                if (!product || !visual) return null;
                const owned =
                  !COSMETIC_THEME_PURCHASES_ENABLED || ownedThemeProducts.includes(productId);
                const pending = pendingProductId === productId;
                const disabled = owned || appStorePurchaseBusy || purchaseDebugLocked;
                return (
                  <article
                    key={productId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "132px minmax(0, 1fr)",
                      gap: 12,
                      padding: 12,
                      borderRadius: 14,
                      border: `1px solid ${owned ? "var(--accent)" : "var(--border)"}`,
                      background: "var(--surface)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        minHeight: 108,
                        borderRadius: 12,
                        background: visual.board,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
                        overflow: "hidden",
                      }}
                    >
                      <BundlePreview visual={visual} />
                    </div>
                    <div style={{ minWidth: 0, display: "grid", gap: 7 }}>
                      <div>
                        <strong style={{ display: "block", fontSize: 15 }}>{product.name}</strong>
                        <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 800 }}>
                          {visual.skin}
                        </span>
                        <small
                          style={{
                            display: "block",
                            marginTop: 3,
                            color: "var(--muted-foreground)",
                            fontSize: 10,
                          }}
                        >
                          8-atom bundle preview
                        </small>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "var(--muted-foreground)",
                          fontSize: 11,
                          lineHeight: 1.35,
                        }}
                      >
                        {product.description}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setPreviewProductId(productId)}
                          style={{ ...secondaryShopButton, padding: "8px 10px" }}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleThemePurchase(productId)}
                          disabled={disabled}
                          style={{
                            ...(owned ? secondaryShopButton : shopButton),
                            padding: "8px 10px",
                            opacity: disabled && !owned ? 0.55 : 1,
                            cursor: disabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {owned
                            ? COSMETIC_THEME_PURCHASES_ENABLED
                              ? "Owned"
                              : "Free for testing"
                            : pending
                              ? "Opening..."
                              : "Buy in App Store"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {cosmeticMessage && (
              <p style={{ margin: "12px 0 0", color: "var(--muted-foreground)", fontSize: 12 }}>
                {cosmeticMessage}
              </p>
            )}
          </section>
        )}

        {isNativeIos && (
          <section
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    color: "var(--accent)",
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  APP STORE COINS
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Buy gold coins</h2>
              </div>
              <WalletPill
                label="Coins"
                value={`${goldCoins}`}
                icon={<GoldCoinIcon size={18} />}
                accent
              />
            </div>
            <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
              Buy extra gold coins for power-ups and experiments. Purchases are processed securely
              by the App Store.
            </p>
            <button
              type="button"
              className="ad-shine-btn"
              onClick={handleRewardedCoin}
              disabled={appStorePurchaseBusy}
              style={{
                ...shopButton,
                width: "100%",
                marginBottom: 10,
                opacity: appStorePurchaseBusy ? 0.6 : 1,
                cursor: appStorePurchaseBusy ? "not-allowed" : "pointer",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Clapperboard size={18} aria-hidden="true" />
                {pendingProductId === "rewarded" ? "Loading ad..." : "Free coins"}
              </span>
            </button>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTabletLayout
                  ? "repeat(4, minmax(0, 1fr))"
                  : "repeat(2, minmax(0, 1fr))",
                gap: isTabletLayout ? 12 : 8,
              }}
            >
              {APP_STORE_COIN_PACKS.map((productId) => {
                const product = getProductById(productId);
                if (!product?.coins) return null;
                return (
                  <button
                    key={productId}
                    type="button"
                    onClick={() => handleNativeCoinPurchase(productId)}
                    disabled={appStorePurchaseBusy || purchaseDebugLocked}
                    style={{
                      ...coinPackButton,
                      opacity:
                        purchaseDebugLocked ||
                        (appStorePurchaseBusy && pendingProductId !== productId)
                          ? 0.55
                          : 1,
                      cursor:
                        appStorePurchaseBusy || purchaseDebugLocked ? "not-allowed" : "pointer",
                    }}
                  >
                    <GoldCoinIcon size={28} />
                    <strong style={coinPackAmount}>{product.coins}x</strong>
                    <span>{pendingProductId === productId ? "Opening..." : "App Store"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {coinToast && <div style={shopCoinToast}>{coinToast.text}</div>}

        <section
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  color: "var(--accent)",
                  fontWeight: 800,
                  marginBottom: 6,
                }}
              >
                INVENTORY POWER-UPS
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Stock your next run</h2>
            </div>
            <div style={walletWrap}>
              <WalletPill
                label="Coins"
                value={`${goldCoins}`}
                icon={<GoldCoinIcon size={18} />}
                accent
              />
            </div>
          </div>
          <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
            Buy extra inventory copies with gold coins. Before each level, you can choose up to 3
            inventory power-ups to start with.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTabletLayout ? "1fr 1fr" : "1fr",
              gap: isTabletLayout ? 12 : 10,
            }}
          >
            {SHOP_POWER_UPS_BY_PRICE.map((powerUp) => {
              const isUnlocked = unlockedLevel >= powerUp.unlockLevel;
              const canAfford = goldCoins >= powerUp.coinCost;
              const canPurchase = isUnlocked && canAfford;
              return (
                <div
                  key={powerUp.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <span style={shopPowerUpIconWrap} aria-label={isUnlocked ? `Owned ${powerUpInventory[powerUp.id]}` : undefined}>
                    <PowerUpBadge icon={powerUp.id} size={34} />
                    {isUnlocked && (
                      <span style={shopPowerUpCountPill} aria-hidden="true">
                        ×{powerUpInventory[powerUp.id]}
                      </span>
                    )}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>
                      {isUnlocked ? powerUp.name : "Secret"}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.35 }}
                    >
                      {isUnlocked
                        ? powerUp.description
                        : `Unlocked at level ${powerUp.unlockLevel}.`}
                    </div>
                    {!isUnlocked && (
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>
                        Secret unlock at level {powerUp.unlockLevel}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handlePowerUpPurchase(
                        powerUp.id,
                        powerUp.coinCost,
                        powerUp.name,
                        powerUp.unlockLevel,
                      )
                    }
                    disabled={!canPurchase}
                    style={{
                      ...shopButton,
                      padding: "9px 10px",
                      minWidth: 78,
                      opacity: canPurchase ? 1 : 0.55,
                      cursor: canPurchase ? "pointer" : "not-allowed",
                    }}
                  >
                    {isUnlocked ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <GoldCoinIcon size={14} />
                        {powerUp.coinCost}
                      </span>
                    ) : (
                      "Secret"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {previewProduct && previewVisual && (
        <ThemePreviewModal
          product={previewProduct}
          visual={previewVisual}
          onClose={() => setPreviewProductId(null)}
        />
      )}
    </div>
  );
}

function GoldCoinIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 32% 24%, oklch(0.98 0.11 95), oklch(0.82 0.17 82) 48%, oklch(0.55 0.14 70))",
        border: "1px solid oklch(0.94 0.13 90)",
        boxShadow: "0 0 10px oklch(0.84 0.16 85 / 0.45), inset 0 -2px 4px rgba(0,0,0,0.25)",
      }}
    />
  );
}

function WalletPill({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: accent ? "var(--accent)" : "var(--foreground)",
        fontSize: 12,
        fontWeight: 900,
        fontVariantNumeric: "tabular-nums",
      }}
      title={label}
    >
      {icon}
      {value}
    </span>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr",
        gap: 8,
        fontSize: 13,
        lineHeight: 1.35,
      }}
    >
      <span style={{ color: "var(--success)", fontWeight: 900 }}>✓</span>
      <span>{text}</span>
    </div>
  );
}

const purchaseSupportPanel: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  display: "grid",
  gap: 10,
};

const shopCoinToast: React.CSSProperties = {
  position: "fixed",
  top: "calc(env(safe-area-inset-top, 0px) + 18px)",
  right: 18,
  zIndex: 1200,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontSize: 11,
  fontWeight: 900,
  boxShadow: "0 10px 26px var(--accent-glow)",
  animation: "coin-toast-rise 1800ms ease-out forwards",
};

const purchaseSupportTitle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.6,
  color: "var(--accent)",
  fontWeight: 900,
  textTransform: "uppercase",
};

const purchaseSupportCopy: React.CSSProperties = {
  margin: "4px 0 0",
  color: "var(--muted-foreground)",
  fontSize: 12,
  lineHeight: 1.4,
};

const purchaseSupportActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
  gap: 8,
};

const purchaseSupportStatus: React.CSSProperties = {
  margin: 0,
  color: "var(--muted-foreground)",
  fontSize: 12,
  lineHeight: 1.4,
};

const purchaseReportBox: React.CSSProperties = {
  width: "100%",
  minHeight: 160,
  resize: "vertical",
  borderRadius: 10,
  padding: 10,
  background: "oklch(0.12 0.02 250)",
  color: "oklch(0.86 0.18 145)",
  border: "1px solid var(--border)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 10,
  lineHeight: 1.45,
};

const debugPanel: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid color-mix(in oklch, var(--accent) 45%, var(--border))",
  display: "grid",
  gap: 10,
};

const debugActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 8,
};

const debugLogBox: React.CSSProperties = {
  maxHeight: 220,
  overflow: "auto",
  borderRadius: 10,
  padding: 10,
  background: "oklch(0.12 0.02 250)",
  color: "oklch(0.86 0.18 145)",
  border: "1px solid var(--border)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 10,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const debugLogLine: React.CSSProperties = {
  marginBottom: 6,
};

const walletWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 6,
};

const proPackActive: React.CSSProperties = {
  marginTop: 4,
  padding: 12,
  borderRadius: 12,
  background: "color-mix(in oklch, var(--success) 18%, transparent)",
  color: "var(--success)",
  fontWeight: 800,
  textAlign: "center",
};

const coinPackButton: React.CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: 4,
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "10px 8px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontSize: 11,
  fontWeight: 800,
};

const coinPackAmount: React.CSSProperties = {
  color: "oklch(0.86 0.17 84)",
  fontSize: 13,
};

const smallButton: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: 10,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};

const shopPowerUpIconWrap: React.CSSProperties = {
  position: "relative",
  display: "grid",
  placeItems: "center",
  width: 36,
  height: 36,
};

const shopPowerUpCountPill: React.CSSProperties = {
  position: "absolute",
  right: -6,
  bottom: -4,
  minWidth: 20,
  padding: "2px 5px",
  borderRadius: 999,
  background: "var(--accent)",
  color: "var(--primary-foreground)",
  fontSize: 10,
  lineHeight: 1,
  fontWeight: 950,
  textAlign: "center",
  boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
};

const shopButton: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 14px",
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryShopButton: React.CSSProperties = {
  borderRadius: 12,
  padding: "12px 14px",
  background: "var(--surface-high)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  fontWeight: 800,
  cursor: "pointer",
};
