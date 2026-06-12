import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/LegalDocument";
import { TERMS_CONTENT } from "@/content/legalDocs.generated";

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
  return <LegalDocument content={TERMS_CONTENT} />;
}
