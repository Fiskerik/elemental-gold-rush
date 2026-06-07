import { createFileRoute } from "@tanstack/react-router";
import {
  DocumentPage,
  documentHeadingStyle,
  documentListStyle,
  documentSectionStyle,
  documentTextStyle,
} from "@/components/DocumentPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Atomic Fusion Rush" },
      {
        name: "description",
        content:
          "Privacy policy for Atomic Fusion Rush, including purchases, analytics, advertising, and data handling practices.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const lastUpdated = "May 22, 2026";

  return (
    <DocumentPage title="Privacy Policy" lastUpdated={lastUpdated}>
      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Overview</h2>
        <p style={documentTextStyle}>
          Atomic Fusion Rush is a puzzle game published by EA Consulting. This policy explains what
          data is processed when you use the game on web and native mobile builds.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Data We Process</h2>
        <p style={documentTextStyle}>Depending on platform and features enabled, we may process:</p>
        <ul style={documentListStyle}>
          <li>Gameplay progress such as levels, score, discovered elements, and inventory.</li>
          <li>Purchase state and entitlements via RevenueCat and the app store provider.</li>
          <li>Crash and diagnostic metadata when analytics/crash tools are enabled.</li>
          <li>Advertising consent and ad-delivery metadata for non-Pro users.</li>
        </ul>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Purchases</h2>
        <p style={documentTextStyle}>
          In-app purchases are processed through Apple App Store billing and RevenueCat. We do not
          receive your full payment card details. Purchase status is used to unlock entitlements
          such as Atomic Fusion Lifetime.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Ads and Consent</h2>
        <p style={documentTextStyle}>
          Non-Pro users may see interstitial ads. We use consent prompts where required by law. You
          can remove forced ads by purchasing Atomic Fusion Lifetime.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Storage and Retention</h2>
        <p style={documentTextStyle}>
          Gameplay state is primarily stored locally on your device or browser. If you delete the app
          or clear browser storage, local progress may be lost unless external backup systems are
          later added.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Your Rights</h2>
        <p style={documentTextStyle}>
          Depending on your location, you may have rights to request access, correction, deletion, or
          limitation of processing for personal data.
        </p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Contact</h2>
        <p style={documentTextStyle}>
          For privacy requests, contact: <strong>eaconsulting.supp@gmail.com</strong>
        </p>
      </section>
    </DocumentPage>
  );
}
