import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | Atomic Fusion Rush" },
      {
        name: "description",
        content:
          "Support page for Atomic Fusion Rush with contact details and issue-reporting guidance.",
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
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

        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900 }}>Support</h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: 8 }}>
          Need help with Atomic Fusion Rush? We are happy to help.
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact</h2>
          <p style={textStyle}>
            Email:{" "}
            <a href="mailto:eaconsulting.supp@gmail.com" style={{ color: "var(--primary)" }}>
              eaconsulting.supp@gmail.com
            </a>
          </p>
          <p style={textStyle}>Typical response time: 1-3 business days.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>How to Report an Issue</h2>
          <ul style={listStyle}>
            <li>Device model (for example, iPhone 14 Pro).</li>
            <li>iOS version.</li>
            <li>App version/build number.</li>
            <li>Exact steps to reproduce the issue.</li>
            <li>Screenshot or short video if possible.</li>
          </ul>
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
