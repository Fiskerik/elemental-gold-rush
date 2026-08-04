import { Link, createFileRoute } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Atom, ChevronRight, Sparkles, Target, Trophy } from "lucide-react";
import { type ReactNode } from "react";

import { COMPOUNDS, type CompoundDefinition } from "@/game/compounds";
import { GameApp } from "@/game/GameApp";
import { MoleculeVisual } from "@/game/MoleculeVisual";
import { PowerUpBadge } from "@/game/PowerUpLibrary";
import { POWER_UPS } from "@/game/powerUps";

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
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://atomic-fusion.lovable.app/" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/96b7dab8-6bea-45f2-9458-357106f22801/id-preview-5ae28a15--a7f1def7-b935-44fb-a197-7b4e163d699c.lovable.app-1778691171983.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/96b7dab8-6bea-45f2-9458-357106f22801/id-preview-5ae28a15--a7f1def7-b935-44fb-a197-7b4e163d699c.lovable.app-1778691171983.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://atomic-fusion.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "Atomic Fusion Rush",
          url: "https://atomic-fusion.lovable.app/",
          applicationCategory: "GameApplication",
          operatingSystem: "iOS, Web",
          genre: "Puzzle",
          description:
            "Fuse atoms, climb the periodic table, discover compounds, and chase Gold in Atomic Fusion Rush.",
        }),
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
