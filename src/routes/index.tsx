import { Link, createFileRoute } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Atom, ChevronRight, Clapperboard, Sparkles, Target, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { COMPOUNDS, type CompoundDefinition } from "@/game/compounds";
import { GameApp } from "@/game/GameApp";
import { MoleculeVisual } from "@/game/MoleculeVisual";
import { PowerUpBadge } from "@/game/PowerUpLibrary";
import { POWER_UPS } from "@/game/powerUps";
import { initAds, showRewardedForCoin } from "@/game/ads";
import { useProgress } from "@/game/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atomic Fusion Rush - Periodic Table Merge Puzzle" },
      {
        name: "description",
        content:
          "Fuse atoms, climb the periodic table, discover compounds, and chase Gold in Atomic Fusion Rush.",
      },
      { property: "og:title", content: "Atomic Fusion Rush" },
      {
        property: "og:description",
        content:
          "Merge hydrogen into helium, unlock power-ups, form compounds, and master the periodic table.",
      },
    ],
  }),
  component: Index,
});

const previewPowerUps = ["shimmer", "grab", "gravity", "molecule"];

const compoundExamples = [
  {
    id: "water",
    formula: "H2O",
    merge: "2 Hydrogen + Oxygen",
    reward: "Early-game bonus",
  },
  {
    id: "carbon-dioxide",
    formula: "CO2",
    merge: "Carbon + 2 Oxygen",
    reward: "Compound chain setup",
  },
];

const appStoreUrl = "https://apps.apple.com/se/app/atomic-fusion-rush/id6771701538";

function Index() {
  if (isNativeShell()) {
    return <GameApp />;
  }

  return <LandingPage />;
}

function isNativeShell() {
  return (
    Capacitor.isNativePlatform() ||
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("platform-native"))
  );
}

function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="landing-brand" href="/">
          <img src="/game-icon.png" alt="" />
          <span>Atomic Fusion Rush</span>
        </a>
        <div className="landing-nav-links">
          <a href="/support.html">Support</a>
          <a href="/terms.html">Terms</a>
          <a href="/privacy.html">Privacy</a>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Periodic table merge puzzle</p>
          <h1>Fuse atoms. Unlock reactions. Chase Gold.</h1>
          <p className="landing-lede">
            Build your way from Hydrogen through the elements, use lab power-ups at the right
            moment, and turn board atoms into real compound bonuses.
          </p>
        <div className="landing-actions">
            <a
              href={appStoreUrl}
              className="landing-primary-action"
              target="_blank"
              rel="noreferrer"
            >
              Download on App Store
              <ChevronRight size={18} aria-hidden="true" />
            </a>
            <Link to="/game" className="landing-secondary-action">
              Play Web Game
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <a className="landing-secondary-action" href="#preview">
              See Preview
            </a>
          </div>
        </div>

        <LandingScreenshot />
      </section>

      <RewardedProgressBanner />

      <section className="landing-feature-strip" aria-label="Game highlights">
        <FeatureStat icon={<Atom size={20} />} value="118" label="elements to discover" />
        <FeatureStat icon={<Sparkles size={20} />} value="14" label="power-ups and lab tools" />
        <FeatureStat icon={<Trophy size={20} />} value="Gold" label="campaign target" />
      </section>

      <section id="preview" className="landing-section">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Preview</p>
          <h2>Power-ups and compound merges</h2>
        </div>

        <div className="landing-powerup-grid" aria-label="Power-up preview">
          {previewPowerUps.map((icon) => {
            const powerUp = POWER_UPS.find((item) => item.icon === icon);
            if (!powerUp) return null;
            return (
              <article key={powerUp.icon} className="landing-powerup-card">
                <PowerUpBadge icon={powerUp.icon} size={54} />
                <h3>{powerUp.name}</h3>
                <p>{powerUp.effect}</p>
              </article>
            );
          })}
        </div>

        <div className="landing-compound-grid" aria-label="Example compound merges">
          {compoundExamples.map((example) => {
            const compound = COMPOUNDS.find((item) => item.id === example.id);
            if (!compound) return null;
            return (
              <CompoundMergeCard
                key={example.id}
                compound={compound}
                formula={example.formula}
                merge={example.merge}
                reward={example.reward}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}

function LandingScreenshot() {
  return (
    <figure className="landing-screenshot-card" aria-label="Atomic Fusion Rush gameplay screenshot">
      <img src="/landing-gameplay.png" alt="Atomic Fusion Rush gameplay with atoms on the board" />
    </figure>
  );
}

function RewardedProgressBanner() {
  const grantGoldCoins = useProgress((s) => s.grantGoldCoins);
  const hasProPack = useProgress((s) => s.hasProPack);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasProPack) return;
    void initAds(false);
  }, [hasProPack]);

  async function handleRewardedCoin() {
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <section className="landing-rewarded" aria-label="Continue your progress">
      <div className="landing-rewarded-copy">
        <p className="landing-eyebrow">Continue your progress</p>
        <h2>Watch an ad to earn a gold coin</h2>
        <p>Stock up on power-ups and keep your run going — grab a free gold coin.</p>
      </div>
      <button
        type="button"
        className="landing-primary-action"
        onClick={handleRewardedCoin}
        disabled={busy || hasProPack}
      >
        <Clapperboard size={18} aria-hidden="true" />
        {busy ? "Loading ad..." : "Watch rewarded ad for +1 coin"}
      </button>
      {message && <p className="landing-rewarded-status">{message}</p>}
    </section>
  );
}

function FeatureStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="landing-feature-stat">
      <span>{icon}</span>
      <strong>{value}</strong>
      <p>{label}</p>
    </article>
  );
}

function CompoundMergeCard({
  compound,
  formula,
  merge,
  reward,
}: {
  compound: CompoundDefinition;
  formula: string;
  merge: string;
  reward: string;
}) {
  return (
    <article className="landing-compound-card">
      <div className="landing-compound-visual">
        <MoleculeVisual compound={compound} size={78} />
      </div>
      <div>
        <h3>{compound.name}</h3>
        <p className="landing-formula">{formula}</p>
        <p>{merge}</p>
        <span>
          <Target size={14} aria-hidden="true" />
          {reward}
        </span>
      </div>
    </article>
  );
}
