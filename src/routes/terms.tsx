import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Atomic Fusion Rush" },
      {
        name: "description",
        content:
          "Terms of service for Atomic Fusion Rush, covering acceptable use, purchases, liability, and account responsibilities.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900 }}>Terms of Service</h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 8 }}>Last updated: {lastUpdated}</p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Acceptance of Terms</h2>
          <p style={textStyle}>
            By using Atomic Fusion Rush, you agree to these Terms of Service and our Privacy Policy.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>License to Use</h2>
          <p style={textStyle}>
            We grant you a limited, non-exclusive, non-transferable license to use the game for
            personal, non-commercial entertainment.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>In-App Purchases</h2>
          <p style={textStyle}>
            Purchases are handled by the platform store and RevenueCat. All purchases are subject to
            the store&apos;s billing terms, refund policies, and regional rules.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Player Conduct</h2>
          <p style={textStyle}>You agree not to:</p>
          <ul style={listStyle}>
            <li>Attempt to reverse engineer or tamper with purchase logic.</li>
            <li>Exploit bugs for unfair progression or unauthorized currency gain.</li>
            <li>Use automated scripts to abuse gameplay systems.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Availability and Changes</h2>
          <p style={textStyle}>
            We may update, change, or discontinue features at any time, including balancing,
            progression, and monetization systems.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Disclaimer and Liability</h2>
          <p style={textStyle}>
            The game is provided &quot;as is&quot; without warranties to the extent allowed by law. To the
            extent permitted by applicable law, we are not liable for indirect or consequential
            damages.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact</h2>
          <p style={textStyle}>
            Terms inquiries: <strong>eaconsulting.supp@gmail.com</strong>
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
