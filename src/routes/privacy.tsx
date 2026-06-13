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
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return <LegalDocument content={PRIVACY_CONTENT} />;
}
