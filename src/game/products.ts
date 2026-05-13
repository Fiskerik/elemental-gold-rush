export const PRODUCT_IDS = {
  proLabPack: "pro_lab_pack",
  themeGoldLab: "theme_gold_lab",
  themeNeonPeriodic: "theme_neon_periodic",
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export interface ProductDefinition {
  id: ProductId;
  name: string;
  description: string;
  type: "non_consumable";
  benefits: string[];
}

export const PRODUCTS: ProductDefinition[] = [
  {
    id: PRODUCT_IDS.proLabPack,
    name: "Pro Lab Pack",
    description:
      "A one-time premium upgrade for players who want extra style, stats, and future lab content.",
    type: "non_consumable",
    benefits: [
      "Remove forced ads if they are added later.",
      "Unlock exclusive board themes.",
      "Unlock advanced stats and mastery summaries.",
      "Unlock extra challenge modes in future updates.",
      "Support future Elemental Gold Rush updates.",
    ],
  },
  {
    id: PRODUCT_IDS.themeGoldLab,
    name: "Gold Lab Theme",
    description: "A premium cosmetic board theme for the Pro Lab Pack.",
    type: "non_consumable",
    benefits: ["Adds a gold-tinted laboratory board style."],
  },
  {
    id: PRODUCT_IDS.themeNeonPeriodic,
    name: "Neon Periodic Theme",
    description: "A premium cosmetic periodic-table theme for the Pro Lab Pack.",
    type: "non_consumable",
    benefits: ["Adds a neon periodic-table inspired board style."],
  },
];

export function getProductById(productId: ProductId): ProductDefinition | undefined {
  return PRODUCTS.find((product) => product.id === productId);
}
