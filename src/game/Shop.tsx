import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import { type InventoryPowerUpId, useProgress } from "./store";
import { POWER_UP_UNLOCK_LEVELS } from "./powerUps";
import { PowerUpBadge } from "./PowerUpLibrary";
import { PRODUCT_IDS, getProductById, type ProductId } from "./products";
import {
  debugNativePurchases,
  isPurchaseDebugUiEnabled,
  presentCustomerCenter,
  purchaseGoldCoinPack,
  purchaseProductWithResult,
  restorePurchases,
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
    coinCost: 4,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.transmute,
    description: "Reroll the loaded atom into a higher tier at the start of a run.",
  },
  {
    id: "fusion-jump",
    name: "Fusion Jump",
    coinCost: 4,
    unlockLevel: POWER_UP_UNLOCK_LEVELS["fusion-jump"],
    description: "Save a tier-skipping merge for a future level opening.",
  },
  {
    id: "catalyst",
    name: "Catalyst Aura",
    coinCost: 8,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.catalyst,
    description: "Start a level with 5 shots of wider fusion radius available.",
  },
  {
    id: "emission",
    name: "Emission",
    coinCost: 10,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.emission,
    description: "Raise your starting queue when a level needs a quick push.",
  },
  {
    id: "gravity",
    name: "Gravity",
    coinCost: 8,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.gravity,
    description: "Bank a board-lifting move for a difficult future board.",
  },
  {
    id: "grab",
    name: "Grab",
    coinCost: 8,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.grab,
    description: "Bring a saved reposition move into your next level.",
  },
  {
    id: "gamma",
    name: "Gamma Bomb",
    coinCost: 8,
    unlockLevel: POWER_UP_UNLOCK_LEVELS.gamma,
    description: "Stock a wide-radius blast that clears surrounding non-stone atoms.",
  },
  {
    id: "molecule",
    name: "Compound",
    coinCost: 10,
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
const SHOP_PURCHASE_GUARD_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timeoutId) window.clearTimeout(timeoutId);
    }),
    new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export function Shop({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const {
    goldCoins,
    unlockedLevel,
    powerUpInventory,
    grantGoldCoins,
    grantProPack,
    purchaseInventoryPowerUp,
    hasProPack,
  } = useProgress();
  const [message, setMessage] = useState("");
  const [pendingProductId, setPendingProductId] = useState<ProductId | "rewarded" | null>(null);
  const [proPackMessage, setProPackMessage] = useState("");
  const [proPackBusy, setProPackBusy] = useState<"purchase" | "restore" | "manage" | "">("");
  const [purchaseDebugBusy, setPurchaseDebugBusy] = useState(false);
  const [purchaseDebugOpen, setPurchaseDebugOpen] = useState(false);
  const [purchaseDebugLogs, setPurchaseDebugLogs] = useState<string[]>([]);
  const [purchaseSupportBusy, setPurchaseSupportBusy] = useState(false);
  const [purchaseSupportMessage, setPurchaseSupportMessage] = useState("");
  const [purchaseReport, setPurchaseReport] = useState("");
  const proPack = getProductById(PRODUCT_IDS.proLabPack);
  const purchaseDebugEnabled = isPurchaseDebugUiEnabled();
  const purchaseDebugLocked = purchaseDebugEnabled && purchaseDebugBusy;
  const showPurchaseSupport = Boolean(
    proPackMessage || message || purchaseSupportMessage || purchaseReport,
  );

  useEffect(() => {
    if (hasProPack) return;
    void initAds(false);
  }, [hasProPack]);

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
    setProPackBusy("purchase");
    setProPackMessage("Opening App Store purchase...");
    try {
      const result = await withTimeout(
        purchaseProductWithResult(PRODUCT_IDS.proLabPack, (statusMessage) =>
          setProPackMessage(statusMessage),
        ),
        SHOP_PURCHASE_GUARD_TIMEOUT_MS,
        "App Store did not respond in time. Try again.",
      );
      if (result.purchased) {
        grantProPack();
        setProPackMessage("Pro Lab Pack unlocked.");
        return;
      }
      setProPackMessage(result.reason ?? "Pro Lab Pack is not available right now.");
    } catch (error) {
      setProPackMessage(
        error instanceof Error ? error.message : "App Store purchase could not be started.",
      );
    } finally {
      setProPackBusy("");
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleProPackRestore() {
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

  async function handleManagePurchases() {
    setProPackBusy("manage");
    setProPackMessage("Opening App Store purchase management...");
    try {
      const opened = await presentCustomerCenter();
      setProPackMessage(
        opened
          ? "Purchase management opened."
          : "No App Store management page is available yet. Use Restore to refresh purchases.",
      );
    } catch (error) {
      setProPackMessage(
        error instanceof Error ? error.message : "Purchase management could not be opened.",
      );
    } finally {
      setProPackBusy("");
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleNativeCoinPurchase(productId: ProductId) {
    setPendingProductId(productId);
    setMessage("Opening App Store purchase...");
    try {
      const result = await withTimeout(
        purchaseGoldCoinPack(productId, (statusMessage) => setMessage(statusMessage)),
        SHOP_PURCHASE_GUARD_TIMEOUT_MS,
        "App Store did not respond in time. Try again.",
      );
      if (result.coins > 0) {
        grantGoldCoins(result.coins);
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
      setPendingProductId(null);
      if (purchaseDebugEnabled) refreshPurchaseDebugLogs();
    }
  }

  async function handleRewardedCoin() {
    setPendingProductId("rewarded");
    setMessage("Loading rewarded ad...");
    try {
      const result = await showRewardedForCoin(hasProPack);
      if (result.rewarded) {
        grantGoldCoins(1);
        setMessage("Reward complete: +1 gold coin.");
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
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              Convert points into gold coins and stock your next run
            </div>
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

        {proPack && (
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
              <Benefit text="Get 50 starting gold coins." />
              <Benefit text="Get +2 extra gold coins on each daily gold claim." />
            </div>
            {hasProPack ? (
              <div style={proPackActive}>Pro Lab Pack Active</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleProPackRestore}
                  disabled={Boolean(proPackBusy) || purchaseDebugLocked}
                  style={{
                    ...secondaryShopButton,
                    opacity:
                      purchaseDebugLocked || (proPackBusy && proPackBusy !== "restore") ? 0.55 : 1,
                  }}
                >
                  {proPackBusy === "restore" ? "Checking..." : "Restore"}
                </button>
                <button
                  type="button"
                  onClick={handleProPackPurchase}
                  disabled={Boolean(proPackBusy) || purchaseDebugLocked}
                  style={{
                    ...shopButton,
                    opacity:
                      purchaseDebugLocked || (proPackBusy && proPackBusy !== "purchase") ? 0.55 : 1,
                  }}
                >
                  {proPackBusy === "purchase" ? "Opening..." : "Unlock Pack"}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleManagePurchases}
              disabled={Boolean(proPackBusy) || purchaseDebugLocked}
              style={{
                ...secondaryShopButton,
                width: "100%",
                marginTop: 10,
                opacity:
                  purchaseDebugLocked || (proPackBusy && proPackBusy !== "manage") ? 0.55 : 1,
              }}
            >
              {proPackBusy === "manage" ? "Opening..." : "Manage Purchases"}
            </button>
            {proPackMessage && (
              <p style={{ margin: "12px 0 0", color: "var(--muted-foreground)", fontSize: 12 }}>
                {proPackMessage}
              </p>
            )}
          </section>
        )}

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
            These packs connect to RevenueCat in the iPhone build. The browser build keeps them as
            safe purchase-layer checks.
          </p>
          <button
            type="button"
            onClick={handleRewardedCoin}
            disabled={hasProPack || Boolean(pendingProductId)}
            style={{
              ...shopButton,
              width: "100%",
              marginBottom: 10,
              opacity:
                hasProPack || (pendingProductId && pendingProductId !== "rewarded") ? 0.6 : 1,
              cursor: hasProPack || pendingProductId ? "not-allowed" : "pointer",
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
              {pendingProductId === "rewarded" ? "Loading ad..." : "Watch rewarded ad for +1 coin"}
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
                  disabled={Boolean(pendingProductId) || purchaseDebugLocked}
                  style={{
                    ...coinPackButton,
                    opacity:
                      purchaseDebugLocked || (pendingProductId && pendingProductId !== productId)
                        ? 0.55
                        : 1,
                    cursor: pendingProductId || purchaseDebugLocked ? "not-allowed" : "pointer",
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
                  <span style={{ display: "grid", placeItems: "center" }} aria-hidden="true">
                    <PowerUpBadge icon={powerUp.id} size={34} />
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
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>
                      {isUnlocked
                        ? `Owned: ${powerUpInventory[powerUp.id]}`
                        : `Secret unlock at level ${powerUp.unlockLevel}`}
                    </div>
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
