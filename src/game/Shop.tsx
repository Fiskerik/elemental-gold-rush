import { useState } from "react";
import { type InventoryPowerUpId, useProgress } from "./store";
import { POWER_UP_UNLOCK_LEVELS } from "./powerUps";
import { PowerUpBadge } from "./PowerUpLibrary";
import { PRODUCT_IDS, getProductById, type ProductId } from "./products";
import { purchaseGoldCoinPack } from "./purchases";
import { showRewardedForCoin } from "./ads";

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
  (a, b) => a.coinCost - b.coinCost || a.unlockLevel - b.unlockLevel || a.name.localeCompare(b.name),
);

const GOLD_COIN_PACKS = [
  { coins: 1, pointCost: 20_000 },
  { coins: 5, pointCost: 80_000 },
  { coins: 10, pointCost: 150_000 },
  { coins: 20, pointCost: 250_000 },
  { coins: 50, pointCost: 500_000 },
] as const;

const APP_STORE_COIN_PACKS = [
  PRODUCT_IDS.coins5,
  PRODUCT_IDS.coins20,
  PRODUCT_IDS.coins50,
  PRODUCT_IDS.coins100,
] as const;

export function Shop({ onBack }: { onBack: () => void }) {
  const {
    totalScore,
    goldCoins,
    unlockedLevel,
    powerUpInventory,
    buyGoldCoins,
    grantGoldCoins,
    purchaseInventoryPowerUp,
    hasProPack,
  } = useProgress();
  const [message, setMessage] = useState("");

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

  function handleGoldCoinPurchase(coins: number, pointCost: number) {
    const purchased = buyGoldCoins(coins, pointCost);
    setMessage(
      purchased
        ? `${coins} gold coin${coins === 1 ? "" : "s"} added.`
        : `You need ${pointCost.toLocaleString()} points for that coin pack.`,
    );
  }

  async function handleNativeCoinPurchase(productId: ProductId) {
    const result = await purchaseGoldCoinPack(productId);
    if (result.coins > 0) {
      grantGoldCoins(result.coins);
      setMessage(
        `${result.coins} gold coin${result.coins === 1 ? "" : "s"} added from App Store purchase.`,
      );
      return;
    }
    setMessage(result.reason ?? "App Store coin purchase is not available right now.");
  }

  async function handleRewardedCoin() {
    const result = await showRewardedForCoin(hasProPack);
    if (result.rewarded) {
      grantGoldCoins(1);
      setMessage("Reward complete: +1 gold coin.");
      return;
    }
    setMessage(result.reason ?? "Rewarded ad not completed or not available yet. Try again shortly.");
  }

  return (
    <div className="app-shell" style={{ padding: 20, paddingTop: 32 }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
            <WalletPill label="Coins" value={`${goldCoins}`} icon={<GoldCoinIcon size={18} />} accent />
          </div>
          <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
            These packs connect to RevenueCat in the iPhone build. The browser build keeps them as
            safe purchase-layer checks.
          </p>
          <button
            type="button"
            onClick={handleRewardedCoin}
            disabled={hasProPack}
            style={{
              ...shopButton,
              width: "100%",
              marginBottom: 10,
              opacity: hasProPack ? 0.6 : 1,
              cursor: hasProPack ? "not-allowed" : "pointer",
            }}
          >
            Watch rewarded ad for +1 coin
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {APP_STORE_COIN_PACKS.map((productId) => {
              const product = getProductById(productId);
              if (!product?.coins) return null;
              return (
                <button
                  key={productId}
                  type="button"
                  onClick={() => handleNativeCoinPurchase(productId)}
                  style={coinPackButton}
                >
                  <GoldCoinIcon size={28} />
                  <strong style={coinPackAmount}>{product.coins}x</strong>
                  <span>App Store</span>
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
                GOLD COINS
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Exchange points</h2>
            </div>
            <div style={walletWrap}>
              <WalletPill label="Points" value={totalScore.toLocaleString()} />
              <WalletPill
                label="Coins"
                value={`${goldCoins}`}
                icon={<GoldCoinIcon size={18} />}
                accent
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))", gap: 8 }}>
            {GOLD_COIN_PACKS.map((pack) => {
              const canAfford = totalScore >= pack.pointCost;
              return (
                <button
                  key={pack.coins}
                  type="button"
                  onClick={() => handleGoldCoinPurchase(pack.coins, pack.pointCost)}
                  disabled={!canAfford}
                  style={{
                    ...coinPackButton,
                    opacity: canAfford ? 1 : 0.55,
                    cursor: canAfford ? "pointer" : "not-allowed",
                  }}
                >
                  <GoldCoinIcon size={28} />
                  <strong style={coinPackAmount}>{pack.coins}x</strong>
                  <span>{pack.pointCost.toLocaleString()} pts</span>
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
            <div
              style={walletWrap}
            >
              <WalletPill label="Points" value={totalScore.toLocaleString()} />
              <WalletPill label="Coins" value={`${goldCoins}`} icon={<GoldCoinIcon size={18} />} accent />
            </div>
          </div>
          <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
            Buy extra inventory copies with gold coins. Before each level, you can choose up to 3
            inventory power-ups to start with.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
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
                  <span
                    style={{ display: "grid", placeItems: "center" }}
                    aria-hidden="true"
                  >
                    <PowerUpBadge icon={powerUp.id} size={34} />
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>{powerUp.name}</div>
                    <div
                      style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.35 }}
                    >
                      {powerUp.description}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>
                      {isUnlocked
                        ? `Owned: ${powerUpInventory[powerUp.id]}`
                        : `Introduced at level ${powerUp.unlockLevel}`}
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
                      `Level ${powerUp.unlockLevel}`
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

const walletWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 6,
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
