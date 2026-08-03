import { createFileRoute } from "@tanstack/react-router";
import {
  DocumentPage,
  documentHeadingStyle,
  documentListStyle,
  documentSectionStyle,
  documentTextStyle,
} from "@/components/DocumentPage";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | Atomic Fusion Rush" },
      {
        name: "description",
        content:
          "Support page for Atomic Fusion Rush with contact details and issue-reporting guidance.",
      },
      { property: "og:title", content: "Support | Atomic Fusion Rush" },
      {
        property: "og:description",
        content: "Contact details and issue-reporting guidance for Atomic Fusion Rush players.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://atomic-fusion.lovable.app/support" },
    ],
    links: [{ rel: "canonical", href: "https://atomic-fusion.lovable.app/support" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do I contact Atomic Fusion Rush support?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Email eaconsulting.supp@gmail.com. Typical response time is 1-3 business days.",
              },
            },
            {
              "@type": "Question",
              name: "What should I include when reporting an issue?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Include your device model, iOS version, app version/build number, exact steps to reproduce the issue, and a screenshot or short video if possible.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <DocumentPage
      title="Support"
      intro={<p>Need help with Atomic Fusion Rush? We are happy to help.</p>}
    >
      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>Contact</h2>
        <p style={documentTextStyle}>
          Email:{" "}
          <a href="mailto:eaconsulting.supp@gmail.com" style={{ color: "var(--primary)" }}>
            eaconsulting.supp@gmail.com
          </a>
        </p>
        <p style={documentTextStyle}>Typical response time: 1-3 business days.</p>
      </section>

      <section style={documentSectionStyle}>
        <h2 style={documentHeadingStyle}>How to Report an Issue</h2>
        <ul style={documentListStyle}>
          <li>Device model (for example, iPhone 14 Pro).</li>
          <li>iOS version.</li>
          <li>App version/build number.</li>
          <li>Exact steps to reproduce the issue.</li>
          <li>Screenshot or short video if possible.</li>
        </ul>
      </section>
    </DocumentPage>
  );
}
