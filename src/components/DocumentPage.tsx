import { useEffect, type CSSProperties, type ReactNode } from "react";

type DocumentPageProps = {
  children: ReactNode;
  intro?: ReactNode;
  lastUpdated?: string;
  title: string;
};

export function DocumentPage({ children, intro, lastUpdated, title }: DocumentPageProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.getElementById("document-page-root")?.scrollTo({ top: 0, left: 0 });
  }, []);

  return (
    <main id="document-page-root" className="document-page-shell">
      <div className="document-page-content">
        <nav className="document-page-nav" aria-label="Page navigation">
          <a href="/" className="document-page-back-link">
            Home
          </a>
          <div className="document-page-link-row">
            <a href="/support.html" className="document-page-nav-link">
              Support
            </a>
            <a href="/terms.html" className="document-page-nav-link">
              Terms
            </a>
            <a href="/privacy.html" className="document-page-nav-link">
              Privacy
            </a>
          </div>
        </nav>

        <header className="document-page-header">
          <h1>{title}</h1>
          {lastUpdated && <p>Last updated: {lastUpdated}</p>}
          {intro && <div className="document-page-intro">{intro}</div>}
        </header>

        <div className="document-page-sections">{children}</div>
      </div>
    </main>
  );
}

export const documentSectionStyle: CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--surface-elevated)",
};

export const documentHeadingStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 20,
  fontWeight: 850,
};

export const documentTextStyle: CSSProperties = {
  margin: 0,
  lineHeight: 1.6,
  color: "var(--foreground)",
};

export const documentListStyle: CSSProperties = {
  margin: "8px 0 0 18px",
  lineHeight: 1.6,
  color: "var(--foreground)",
};
