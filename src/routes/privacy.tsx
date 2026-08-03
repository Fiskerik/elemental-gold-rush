import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/LegalDocument";
import { PRIVACY_CONTENT } from "@/content/legalDocs.generated";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Atomic Fusion Rush" },
      {
        name: "description",
        content:
          "Privacy policy for Atomic Fusion Rush, including purchases, analytics, advertising, and data handling practices.",
      },
      { property: "og:title", content: "Privacy Policy | Atomic Fusion Rush" },
      {
        property: "og:description",
        content:
          "How Atomic Fusion Rush handles purchases, analytics, advertising, and player data.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://atomic-fusion.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://atomic-fusion.lovable.app/privacy" }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return <LegalDocument content={PRIVACY_CONTENT} />;
}
