import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Atomic Fuse" },
      {
        name: "description",
        content:
          "Privacy policy for Atomic Fuse, including purchases, analytics, advertising, and data handling practices.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const lastUpdated = "May 22, 2026";

  return (
    <div className="app-shell" style={{ padding: 24 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--foreground)",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Back to game
          </Link>
        </div>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900 }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 8 }}>Last updated: {lastUpdated}</p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Overview</h2>
          <p style={textStyle}>
            Atomic Fuse is a puzzle game published by EA Consulting. This policy explains what data
            is processed when you use the game on web and native mobile builds.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Data We Process</h2>
          <p style={textStyle}>Depending on platform and features enabled, we may process:</p>
          <ul style={listStyle}>
            <li>Gameplay progress such as levels, score, discovered elements, and inventory.</li>
            <li>Purchase state and entitlements via RevenueCat and the app store provider.</li>
            <li>Crash and diagnostic metadata when analytics/crash tools are enabled.</li>
            <li>Advertising consent and ad-delivery metadata for non-Pro users.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Purchases</h2>
          <p style={textStyle}>
            In-app purchases are processed through Apple App Store billing and RevenueCat. We do not
            receive your full payment card details. Purchase status is used to unlock entitlements
            such as Atomic Fusion Lifetime.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Ads and Consent</h2>
          <p style={textStyle}>
            Non-Pro users may see interstitial ads. We use consent prompts where required by law.
            You can remove forced ads by purchasing Atomic Fusion Lifetime.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Storage and Retention</h2>
          <p style={textStyle}>
            Gameplay state is primarily stored locally on your device or browser. If you delete the
            app or clear browser storage, local progress may be lost unless external backup systems
            are later added.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Your Rights</h2>
          <p style={textStyle}>
            Depending on your location, you may have rights to request access, correction, deletion,
            or limitation of processing for personal data.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact</h2>
          <p style={textStyle}>
            For privacy requests, contact: <strong>privacy@atomicfusegame.com</strong>
          </p>
        </section>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--surface-elevated)",
};

const headingStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 20,
  fontWeight: 850,
};

const textStyle: React.CSSProperties = {
  margin: 0,
  lineHeight: 1.6,
  color: "var(--foreground)",
};

const listStyle: React.CSSProperties = {
  margin: "8px 0 0 18px",
  lineHeight: 1.6,
  color: "var(--foreground)",
};
