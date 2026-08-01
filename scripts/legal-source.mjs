// English source content for legal documents.
export const LANGS = [
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "ja", label: "日本語" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "fr", label: "Français" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "ru", label: "Русский" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "hi", label: "हिन्दी" },
  { code: "de", label: "Deutsch" },
];

export const UI = {
  languageLabel: "Language",
  lastUpdatedLabel: "Last updated",
};

export const PRIVACY = {
  title: "Privacy Policy",
  lastUpdated: "May 22, 2026",
  sections: [
    {
      heading: "Overview",
      body: [
        "Atomic Fusion Rush is a puzzle game published by EA Consulting. This policy explains what data is processed when you use the game on web and native mobile builds.",
      ],
    },
    {
      heading: "Data We Process",
      body: ["Depending on platform and features enabled, we may process:"],
      list: [
        "Gameplay progress such as levels, score, discovered elements, and inventory.",
        "Purchase state and entitlements via RevenueCat and the app store provider.",
        "Crash and diagnostic metadata when analytics/crash tools are enabled.",
        "Advertising consent and ad-delivery metadata for non-Pro users.",
      ],
    },
    {
      heading: "Purchases",
      body: [
        "In-app purchases are processed through Apple App Store billing and RevenueCat. We do not receive your full payment card details. Purchase status is used to unlock entitlements such as Atomic Fusion Lifetime.",
      ],
    },
    {
      heading: "Ads and Consent",
      body: [
        "Non-Pro users may see interstitial ads. We use consent prompts where required by law. You can remove forced ads by purchasing Atomic Fusion Lifetime.",
      ],
    },
    {
      heading: "Storage and Retention",
      body: [
        "Gameplay state is stored locally on your device or browser. On supported iOS builds, signing in to Game Center enables a private CloudKit backup that can restore progress after reinstalling on the same Apple account. Browser progress and unsynced offline progress may still be lost if local storage is cleared.",
      ],
    },
    {
      heading: "Your Rights",
      body: [
        "Depending on your location, you may have rights to request access, correction, deletion, or limitation of processing for personal data.",
      ],
    },
    {
      heading: "Contact",
      body: ["For privacy requests, contact: eaconsulting.supp@gmail.com"],
    },
  ],
};

export const TERMS = {
  title: "Terms of Service",
  lastUpdated: "May 22, 2026",
  sections: [
    {
      heading: "Acceptance of Terms",
      body: [
        "By using Atomic Fusion Rush, you agree to these Terms of Service and our Privacy Policy.",
      ],
    },
    {
      heading: "License to Use",
      body: [
        "We grant you a limited, non-exclusive, non-transferable license to use the game for personal, non-commercial entertainment.",
      ],
    },
    {
      heading: "In-App Purchases",
      body: [
        "Purchases are handled by the platform store and RevenueCat. All purchases are subject to the store's billing terms, refund policies, and regional rules.",
      ],
    },
    {
      heading: "Player Conduct",
      body: ["You agree not to:"],
      list: [
        "Attempt to reverse engineer or tamper with purchase logic.",
        "Exploit bugs for unfair progression or unauthorized currency gain.",
        "Use automated scripts to abuse gameplay systems.",
      ],
    },
    {
      heading: "Availability and Changes",
      body: [
        "We may update, change, or discontinue features at any time, including balancing, progression, and monetization systems.",
      ],
    },
    {
      heading: "Disclaimer and Liability",
      body: [
        `The game is provided on an as-is basis, without warranties to the extent allowed by law. To the extent permitted by applicable law, we are not liable for indirect or consequential damages.`,
      ],
    },
    {
      heading: "Contact",
      body: ["Terms inquiries: eaconsulting.supp@gmail.com"],
    },
  ],
};
