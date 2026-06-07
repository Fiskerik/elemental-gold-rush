import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { Capacitor } from "@capacitor/core";
import { Atom, FlaskConical, Sparkles, Trophy, Play } from "lucide-react";
import { GameApp } from "@/game/GameApp";
import { POWER_UPS } from "@/game/powerUps";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atomic Fusion Rush — Merge the Periodic Table" },
      {
        name: "description",
        content:
          "A free merge puzzle game: fuse atoms, climb all 118 elements of the periodic table, and chase Gold. Learn the mechanics, powerups, and play in your browser.",
      },
      { property: "og:title", content: "Atomic Fusion Rush" },
      {
        property: "og:description",
        content:
          "Merge hydrogen into helium, helium into lithium... all the way to gold and beyond. Play free in your browser.",
      },
      { property: "og:url", content: "https://atomic-fusion.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://atomic-fusion.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  // Native (Capacitor) builds boot at "/" and must go straight into the game.
  if (Capacitor.isNativePlatform()) {
    return <GameApp />;
  }
  return <LandingPage />;
}

const MECHANICS = [
  {
    icon: Atom,
    title: "Drop & merge atoms",
    body: "Launch atoms onto the board. When two identical elements touch, they fuse into the next one up the periodic table.",
  },
  {
    icon: Trophy,
    title: "Climb to Gold",
    body: "Chain reactions and combos to race from Hydrogen all the way to Gold (Au) and beyond across 118 real elements.",
  },
  {
    icon: FlaskConical,
    title: "Real chemistry",
    body: "Every element carries a real-world fact, plus discoverable compounds you can build for big bonus points.",
  },
  {
    icon: Sparkles,
    title: "Campaign & lab modes",
    body: "Progress through campaign levels, then take on boss labs and challenge modes as new powerups unlock.",
  },
] as const;

const FEATURED_POWERUPS = ["shimmer", "grab", "egun", "gravity", "molecule", "gamma"] as const;

function LandingPage() {
  const powerups = FEATURED_POWERUPS.map((icon) =>
    POWER_UPS.find((p) => p.icon === icon),
  ).filter((p): p is (typeof POWER_UPS)[number] => Boolean(p));

  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at 20% 12%, oklch(0.36 0.07 250 / 0.3), transparent 45%), radial-gradient(circle at 82% 78%, oklch(0.48 0.08 55 / 0.22), transparent 50%), oklch(0.16 0.02 255)",
        color: "var(--foreground)",
      }}
    >
      {/* Hero */}
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "64px 24px 40px",
          display: "grid",
          justifyItems: "center",
          textAlign: "center",
          gap: 18,
        }}
      >
        <img
          src="/game-icon.png"
          alt="Atomic Fusion Rush app icon"
          width={108}
          height={108}
          style={{
            width: 108,
            height: 108,
            borderRadius: 26,
            boxShadow: "0 18px 46px rgba(0,0,0,0.46), 0 0 24px rgba(255, 205, 80, 0.18)",
          }}
        />
        <h1 className="gold-text" style={{ fontSize: 44, fontWeight: 900, margin: 0, lineHeight: 1.05 }}>
          Atomic Fusion Rush
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--muted-foreground)",
            maxWidth: 560,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          A relaxing-yet-addictive merge puzzle. Fuse atoms, climb the entire periodic table, and
          chase Gold — all in your browser, free.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
          <Link to="/game" style={heroPrimaryBtn}>
            <Play size={20} strokeWidth={2.5} />
            Play Now
          </Link>
          <a href="#how-it-works" style={heroSecondaryBtn}>
            Learn more
          </a>
        </div>
      </section>

      {/* Mechanics */}
      <section
        id="how-it-works"
        style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px", scrollMarginTop: 24 }}
      >
        <h2 style={sectionHeading}>How it works</h2>
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {MECHANICS.map(({ icon: Icon, title, body }) => (
            <div key={title} style={cardStyle}>
              <div style={iconBadge}>
                <Icon size={22} />
              </div>
              <h3 style={{ margin: "12px 0 6px", fontSize: 17 }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.55 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Powerups */}
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 40px" }}>
        <h2 style={sectionHeading}>Powerups to master</h2>
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {powerups.map((p) => (
            <div key={p.name} style={cardStyle}>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--accent)" }}>{p.name}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.55 }}>
                {p.effect}
              </p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <Link to="/game" style={heroPrimaryBtn}>
            <Play size={20} strokeWidth={2.5} />
            Start Playing
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "color-mix(in oklab, var(--surface) 60%, transparent)",
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            padding: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Link to="/terms" style={footerLink}>
              Terms
            </Link>
            <Link to="/privacy" style={footerLink}>
              Privacy Policy
            </Link>
            <Link to="/support" style={footerLink}>
              Support
            </Link>
          </nav>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
            © EA Consulting 2026. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

const heroPrimaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  border: "none",
  borderRadius: 14,
  padding: "14px 26px",
  fontSize: 17,
  fontWeight: 800,
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  boxShadow: "0 12px 30px -8px color-mix(in oklab, var(--accent) 60%, transparent)",
  cursor: "pointer",
};

const heroSecondaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  borderRadius: 14,
  padding: "14px 22px",
  fontSize: 16,
  fontWeight: 700,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--foreground)",
};

const sectionHeading: CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  textAlign: "center",
  margin: "0 0 22px",
};

const cardStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--surface-elevated)",
  padding: 18,
};

const iconBadge: CSSProperties = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  background: "color-mix(in oklab, var(--accent) 20%, transparent)",
  color: "var(--accent)",
};

const footerLink: CSSProperties = {
  color: "var(--muted-foreground)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
};
