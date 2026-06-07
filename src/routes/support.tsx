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
