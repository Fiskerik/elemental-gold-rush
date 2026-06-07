import { createFileRoute } from "@tanstack/react-router";
import {
  DocumentPage,
  documentHeadingStyle,
  documentListStyle,
  documentSectionStyle,
  documentTextStyle,
} from "@/components/DocumentPage";

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
    <DocumentPage title="Terms of Service" lastUpdated={lastUpdated}>
      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Acceptance of Terms</h2>
        <p style={documentTextStyle}>
          By using Atomic Fusion Rush, you agree to these Terms of Service and our Privacy Policy.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>License to Use</h2>
        <p style={documentTextStyle}>
          We grant you a limited, non-exclusive, non-transferable license to use the game for
          personal, non-commercial entertainment.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>In-App Purchases</h2>
        <p style={documentTextStyle}>
          Purchases are handled by the platform store and RevenueCat. All purchases are subject to
          the store&apos;s billing terms, refund policies, and regional rules.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Player Conduct</h2>
        <p style={documentTextStyle}>You agree not to:</p>
        <ul style={documentListStyle}>
          <li>Attempt to reverse engineer or tamper with purchase logic.</li>
          <li>Exploit bugs for unfair progression or unauthorized currency gain.</li>
          <li>Use automated scripts to abuse gameplay systems.</li>
        </ul>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Availability and Changes</h2>
        <p style={documentTextStyle}>
          We may update, change, or discontinue features at any time, including balancing,
          progression, and monetization systems.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Disclaimer and Liability</h2>
        <p style={documentTextStyle}>
          The game is provided &quot;as is&quot; without warranties to the extent allowed by law. To the
          extent permitted by applicable law, we are not liable for indirect or consequential
          damages.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Contact</h2>
        <p style={documentTextStyle}>
          Terms inquiries: <strong>eaconsulting.supp@gmail.com</strong>
        </p>
      </section>
    </DocumentPage>
  );
}
