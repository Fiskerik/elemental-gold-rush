export const PRODUCT_IDS = {
  proLabPack: "lifetime",
  coins5: "coins_5",
  coins20: "coins_20",
  coins50: "coins_50",
  coins100: "coins_100",
  themeGoldLab: "theme_gold_lab",
  themeNeonPeriodic: "theme_neon_periodic",
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export interface ProductDefinition {
  id: ProductId;
  name: string;
  description: string;
  type: "non_consumable" | "consumable";
  coins?: number;
  benefits: string[];
}

export const PRODUCTS: ProductDefinition[] = [
  {
    id: PRODUCT_IDS.proLabPack,
    name: "Pro Lab Pack - Lifetime",
    description:
      "A one-time premium upgrade that removes forced ads and adds extra launch bonuses.",
    type: "non_consumable",
    benefits: [
      "Remove forced interstitial ads.",
      "Unlock the Pro Lab profile badge.",
      "Includes 50 starting gold coins in the App Store build.",
      "Adds +2 extra gold coins on daily gold claims.",
      "Support future Elemental Gold Rush updates.",
    ],
  },
  {
    id: PRODUCT_IDS.coins5,
    name: "5x Gold Coins",
    description: "Adds 5 gold coins to your shop wallet.",
    type: "consumable",
    coins: 5,
    benefits: ["Quick boost for early inventory purchases."],
  },
  {
    id: PRODUCT_IDS.coins20,
    name: "20x Gold Coins",
    description: "Adds 20 gold coins to your shop wallet.",
    type: "consumable",
    coins: 20,
    benefits: ["Build a stronger inventory reserve."],
  },
  {
    id: PRODUCT_IDS.coins50,
    name: "50x Gold Coins",
    description: "Adds 50 gold coins to your shop wallet.",
    type: "consumable",
    coins: 50,
    benefits: ["Load up for multiple challenge runs."],
  },
  {
    id: PRODUCT_IDS.coins100,
    name: "100x Gold Coins",
    description: "Adds 100 gold coins to your shop wallet.",
    type: "consumable",
    coins: 100,
    benefits: ["Maximum reserve for long progression sessions."],
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
