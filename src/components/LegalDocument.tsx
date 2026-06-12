import { useEffect, useState } from "react";
import {
  DocumentPage,
  documentHeadingStyle,
  documentListStyle,
  documentSectionStyle,
  documentTextStyle,
} from "@/components/DocumentPage";
import {
  LEGAL_LANGUAGES,
  LEGAL_LAST_UPDATED_DATE,
  type LegalDoc,
  type LegalLang,
} from "@/content/legalDocs.generated";

const STORAGE_KEY = "legal-doc-language";

function isLegalLang(value: unknown): value is LegalLang {
  return (
    typeof value === "string" && LEGAL_LANGUAGES.some((entry) => entry.code === value)
  );
}

function getInitialLanguage(): LegalLang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLegalLang(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

type LegalDocumentProps = {
  content: Record<LegalLang, LegalDoc>;
};

export function LegalDocument({ content }: LegalDocumentProps) {
  const [language, setLanguage] = useState<LegalLang>("en");

  useEffect(() => {
    setLanguage(getInitialLanguage());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
  }, [language]);

  const doc = content[language] ?? content.en;
  const dir = LEGAL_LANGUAGES.find((entry) => entry.code === language)?.dir ?? "ltr";

  const toolbar = (
    <label className="document-language-picker">
      <span>Language</span>
      <select
        aria-label="Select language"
        value={language}
        onChange={(event) => setLanguage(event.target.value as LegalLang)}
      >
        {LEGAL_LANGUAGES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <DocumentPage
      title={doc.title}
      lastUpdated={`${doc.lastUpdatedLabel}: ${LEGAL_LAST_UPDATED_DATE}`}
      toolbar={toolbar}
      contentDir={dir}
    >
      {doc.sections.map((section, index) => (
        <section key={index} style={documentSectionStyle}>
          <h2 style={documentHeadingStyle}>{section.heading}</h2>
          {section.body.map((paragraph, pIndex) => (
            <p key={pIndex} style={pIndex === 0 ? documentTextStyle : { ...documentTextStyle, marginTop: 8 }}>
              {paragraph}
            </p>
          ))}
          {section.list && (
            <ul style={documentListStyle}>
              {section.list.map((item, lIndex) => (
                <li key={lIndex}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </DocumentPage>
  );
}