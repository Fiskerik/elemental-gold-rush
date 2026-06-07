import { Link, createFileRoute } from "@tanstack/react-router";
import { Atom, ChevronRight, Sparkles, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";

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

function Index() {
  if (isNativeShell()) {
    return <GameApp />;
  }

  return <LandingPage />;
}

function isNativeShell() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("platform-native")
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
          <Link to="/support">Support</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
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
            <Link to="/game" className="landing-primary-action">
              Play Web Game
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <a className="landing-secondary-action" href="#preview">
              See Preview
            </a>
          </div>
        </div>

        <GamePreview />
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

function GamePreview() {
  return (
    <div className="landing-preview-card" aria-label="Gameplay preview">
      <div className="landing-preview-top">
        <span>Level 12</span>
        <span>Target: Mg</span>
      </div>
      <div className="landing-board-preview">
        {[
          "H",
          "He",
          "Li",
          "Be",
          "B",
          "C",
          "N",
          "O",
          "F",
          "Ne",
          "Na",
          "Mg",
        ].map((symbol, index) => (
          <span key={`${symbol}-${index}`} className="landing-atom-token">
            {symbol}
          </span>
        ))}
      </div>
      <div className="landing-preview-footer">
        <span>Queue</span>
        <div className="landing-preview-queue">
          <span>H</span>
          <span>Li</span>
          <span>O</span>
          <span>C</span>
        </div>
      </div>
    </div>
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
