import { useState } from "react";
import { PRODUCT_IDS, getProductById } from "./products";
import { purchaseProduct, restorePurchases } from "./purchases";
import { type InventoryPowerUpId, useProgress } from "./store";

const SHOP_POWER_UPS: Array<{
  id: InventoryPowerUpId;
  icon: string;
  name: string;
  cost: number;
  description: string;
}> = [
  {
    id: "transmute",
    icon: "🔀",
    name: "Transmute Shot",
    cost: 10000,
    description: "Reroll the loaded atom into a higher tier at the start of a run.",
  },
  {
    id: "fusion-jump",
    icon: "⏭",
    name: "Fusion Jump",
    cost: 6000,
    description: "Save a tier-skipping merge for a future level opening.",
  },
  {
    id: "catalyst",
    icon: "🧪",
    name: "Catalyst Aura",
    cost: 10000,
    description: "Start a level with 5 shots of wider fusion radius available.",
  },
  {
    id: "emission",
    icon: "☢",
    name: "Emission",
    cost: 15000,
    description: "Raise your starting queue when a level needs a quick push.",
  },
  {
    id: "gravity",
    icon: "🌀",
    name: "Gravity",
    cost: 6000,
    description: "Bank a board-lifting move for a difficult future board.",
  },
  {
    id: "grab",
    icon: "🤚",
    name: "Grab",
    cost: 20000,
    description: "Bring a saved reposition move into your next level.",
  },
  {
    id: "gamma",
    icon: "☢",
    name: "Gamma Bomb",
    cost: 15000,
    description: "Stock a wide-radius blast that clears surrounding non-stone atoms.",
  },
];

export function Shop({ onBack }: { onBack: () => void }) {
  const { hasProPack, grantProPack, totalScore, powerUpInventory, purchaseInventoryPowerUp } =
    useProgress();
  const [message, setMessage] = useState("");
  const proPack = getProductById(PRODUCT_IDS.proLabPack);

  async function handlePurchase() {
    const completed = await purchaseProduct(PRODUCT_IDS.proLabPack);
    if (completed) {
      grantProPack();
      setMessage("Pro Lab Pack unlocked.");
      return;
    }
    setMessage("Native App Store purchase support is not available in this web build yet.");
  }

  function handlePowerUpPurchase(powerUp: InventoryPowerUpId, cost: number, name: string) {
    const purchased = purchaseInventoryPowerUp(powerUp, cost);
    setMessage(
      purchased
        ? `${name} added to your inventory.`
        : `You need ${cost.toLocaleString()} total score to buy ${name}.`,
    );
  }

  async function handleRestore() {
    const restored = await restorePurchases();
    if (restored.includes(PRODUCT_IDS.proLabPack)) {
      grantProPack();
      setMessage("Pro Lab Pack restored.");
      return;
    }
    setMessage("No Pro Lab Pack purchase was found for this web build.");
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
              Premium upgrades and future StoreKit products
            </div>
          </div>
        </div>

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
              fontSize: 11,
              letterSpacing: 2,
              color: "var(--accent)",
              fontWeight: 800,
              marginBottom: 6,
            }}
          >
            ONE-TIME UPGRADE
          </div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{proPack?.name}</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.5 }}>
            {proPack?.description}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
            {proPack?.benefits.map((benefit) => (
              <div
                key={benefit}
                style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.35 }}
              >
                <span style={{ color: "var(--success)" }}>✓</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "var(--surface)",
              color: "var(--muted-foreground)",
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            Purchases are routed through a platform layer so an App Store build can connect this
            product to StoreKit without adding native purchase SDK calls to UI components.
          </div>
          {hasProPack ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "color-mix(in oklch, var(--success) 18%, transparent)",
                color: "var(--success)",
                fontWeight: 800,
                textAlign: "center",
              }}
            >
              Pro Lab Pack Active
            </div>
          ) : (
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}
            >
              <button
                onClick={handleRestore}
                style={{
                  ...shopButton,
                  background: "var(--surface-high)",
                  color: "var(--foreground)",
                }}
              >
                Restore
              </button>
              <button onClick={handlePurchase} style={shopButton}>
                Unlock Pack
              </button>
            </div>
          )}
          {message && (
            <p style={{ margin: "12px 0 0", color: "var(--muted-foreground)", fontSize: 12 }}>
              {message}
            </p>
          )}
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
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {totalScore.toLocaleString()} score
            </div>
          </div>
          <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
            Buy extra inventory copies with your saved score. Before each level, you can choose up
            to 3 inventory power-ups to start with.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {SHOP_POWER_UPS.map((powerUp) => {
              const canAfford = totalScore >= powerUp.cost;
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
                  <span style={{ fontSize: 24, textAlign: "center" }} aria-hidden="true">
                    {powerUp.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>{powerUp.name}</div>
                    <div
                      style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.35 }}
                    >
                      {powerUp.description}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>
                      Owned: {powerUpInventory[powerUp.id]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePowerUpPurchase(powerUp.id, powerUp.cost, powerUp.name)}
                    disabled={!canAfford}
                    style={{
                      ...shopButton,
                      padding: "9px 10px",
                      minWidth: 78,
                      opacity: canAfford ? 1 : 0.55,
                      cursor: canAfford ? "pointer" : "not-allowed",
                    }}
                  >
                    {powerUp.cost.toLocaleString()}
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
