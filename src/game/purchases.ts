import { Capacitor } from "@capacitor/core";
import { PRODUCT_IDS, ProductId, getProductById } from "./products";

type CustomerInfo = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
};

type RevenueCatPackage = {
  identifier: string;
  product: {
    identifier: string;
  };
};

type RevenueCatOffering = {
  identifier: string;
  availablePackages?: RevenueCatPackage[];
  lifetime?: RevenueCatPackage | null;
};

type PurchasesOfferings = {
  current?: RevenueCatOffering | null;
  all?: Record<string, RevenueCatOffering>;
};

type PurchasesModule = {
  Purchases: {
    configure: (options: { apiKey: string }) => Promise<void>;
    getCustomerInfo: () => Promise<{ customerInfo: CustomerInfo }>;
    getOfferings: () => Promise<PurchasesOfferings>;
    purchasePackage: (options: { aPackage: RevenueCatPackage }) => Promise<{ customerInfo: CustomerInfo }>;
    restorePurchases: () => Promise<{ customerInfo: CustomerInfo }>;
    addCustomerInfoUpdateListener?: (
      customerInfoUpdateListener: (customerInfo: CustomerInfo) => void,
    ) => Promise<string>;
    removeCustomerInfoUpdateListener?: (options: { listenerToRemove: string }) => Promise<void>;
    setLogLevel?: (options: { level: string }) => Promise<void>;
  };
  LOG_LEVEL?: {
    DEBUG?: string;
  };
};

const PURCHASES_MODULE = "@revenuecat/purchases-capacitor";
const DEFAULT_PRO_ENTITLEMENT = "atomic_fusion_lifetime";
const DEFAULT_OFFERING_ID = "default";

let configured = false;
let customerInfoListenerId: string | null = null;
let missingConfigLogged = false;

export type PurchaseGoldCoinResult = {
  coins: number;
  reason?: string;
};

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function getRevenueCatApiKey(): string {
  return (
    import.meta.env.VITE_REVENUECAT_API_KEY ??
    import.meta.env.VITE_REVENUECAT_IOS_API_KEY ??
    import.meta.env.VITE_RC_IOS_API_KEY ??
    ""
  );
}

function getEntitlementId(): string {
  return import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID ?? DEFAULT_PRO_ENTITLEMENT;
}

function getOfferingId(): string {
  return import.meta.env.VITE_REVENUECAT_OFFERING_ID ?? DEFAULT_OFFERING_ID;
}

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements?.active?.[getEntitlementId()]);
}

async function loadPurchases(): Promise<PurchasesModule | null> {
  try {
    return (await import(/* @vite-ignore */ PURCHASES_MODULE)) as PurchasesModule;
  } catch {
    return null;
  }
}

async function ensureConfigured(): Promise<PurchasesModule | null> {
  if (!isNativePlatform()) return null;
  const purchases = await loadPurchases();
  if (!purchases) return null;
  if (configured) return purchases;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    if (!missingConfigLogged) {
      console.warn(
        "RevenueCat API key is missing. Set VITE_REVENUECAT_IOS_API_KEY (or VITE_REVENUECAT_API_KEY) in iOS release builds.",
      );
      missingConfigLogged = true;
    }
    return null;
  }
  if (!import.meta.env.PROD) {
    await purchases.Purchases.setLogLevel?.({ level: purchases.LOG_LEVEL?.DEBUG ?? "DEBUG" });
  }
  await purchases.Purchases.configure({ apiKey });
  configured = true;
  return purchases;
}

async function findPackage(productId: ProductId): Promise<RevenueCatPackage | null> {
  const purchases = await ensureConfigured();
  if (!purchases) return null;

  const offerings = await purchases.Purchases.getOfferings();
  const offeringId = getOfferingId();
  const preferred =
    offerings.current?.identifier === offeringId
      ? offerings.current
      : offerings.all?.[offeringId] ?? offerings.current;

  const packages = preferred?.availablePackages ?? [];
  const directMatch =
    packages.find((pkg) => pkg.product.identifier === productId) ??
    packages.find((pkg) => pkg.identifier === productId) ??
    null;
  if (directMatch) return directMatch;

  const product = getProductById(productId);
  if (!product?.coins) return null;

  const normalizedNeedles = [
    `coins${product.coins}`,
    `coin${product.coins}`,
    `${product.coins}coins`,
    `${product.coins}coin`,
  ];
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    packages.find((pkg) => {
      const productToken = normalize(pkg.product.identifier);
      const packageToken = normalize(pkg.identifier);
      return normalizedNeedles.some(
        (needle) => productToken.includes(needle) || packageToken.includes(needle),
      );
    }) ?? null
  );
}

export async function initPurchases(): Promise<boolean> {
  const purchases = await ensureConfigured();
  if (!purchases) return false;
  const { customerInfo } = await purchases.Purchases.getCustomerInfo();
  return hasProEntitlement(customerInfo);
}

export async function syncCustomerInfoEntitlement(): Promise<boolean> {
  const purchases = await ensureConfigured();
  if (!purchases) return false;
  const { customerInfo } = await purchases.Purchases.getCustomerInfo();
  return hasProEntitlement(customerInfo);
}

export async function setCustomerInfoListener(
  onEntitlementChanged: (hasEntitlement: boolean) => void,
): Promise<void> {
  const purchases = await ensureConfigured();
  if (!purchases || !purchases.Purchases.addCustomerInfoUpdateListener) return;
  if (customerInfoListenerId) return;

  customerInfoListenerId = await purchases.Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    onEntitlementChanged(hasProEntitlement(customerInfo));
  });
}

export async function clearCustomerInfoListener(): Promise<void> {
  const purchases = await ensureConfigured();
  if (!purchases || !purchases.Purchases.removeCustomerInfoUpdateListener || !customerInfoListenerId) return;
  await purchases.Purchases.removeCustomerInfoUpdateListener({
    listenerToRemove: customerInfoListenerId,
  });
  customerInfoListenerId = null;
}

export async function presentPaywallIfNeeded(): Promise<boolean> {
  // Temporarily disabled while isolating iOS startup crash related to native UI SDK loading.
  return false;
}

export async function presentCustomerCenter(): Promise<boolean> {
  // Temporarily disabled while isolating iOS startup crash related to native UI SDK loading.
  return false;
}

export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  const product = getProductById(productId);
  if (!product || product.type !== "non_consumable") return false;
  const purchases = await ensureConfigured();
  const packageToPurchase = await findPackage(productId);
  if (!purchases || !packageToPurchase) {
    console.log("Native App Store purchase support is not available in this build.", { productId });
    return false;
  }
  const { customerInfo } = await purchases.Purchases.purchasePackage({
    aPackage: packageToPurchase,
  });
  return productId === PRODUCT_IDS.proLabPack ? hasProEntitlement(customerInfo) : true;
}

export async function purchaseGoldCoinPack(productId: ProductId): Promise<PurchaseGoldCoinResult> {
  const product = getProductById(productId);
  if (!product || product.type !== "consumable" || !product.coins) {
    return { coins: 0, reason: "Invalid product configuration." };
  }
  if (!isNativePlatform()) {
    return { coins: 0, reason: "App Store purchases are only available in the iPhone app." };
  }
  const purchases = await ensureConfigured();
  if (!purchases) {
    return {
      coins: 0,
      reason: "RevenueCat is not configured in this build. Add VITE_REVENUECAT_IOS_API_KEY in Codemagic.",
    };
  }
  const packageToPurchase = await findPackage(productId);
  if (!packageToPurchase) {
    const offeringId = getOfferingId();
    return {
      coins: 0,
      reason: `Product not found in RevenueCat offering '${offeringId}'. Check product IDs and offering setup.`,
    };
  }
  try {
    await purchases.Purchases.purchasePackage({ aPackage: packageToPurchase });
    return { coins: product.coins };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "App Store purchase could not be completed right now.";
    return { coins: 0, reason: message };
  }
}

export async function restorePurchases(): Promise<ProductId[]> {
  const purchases = await ensureConfigured();
  if (!purchases) {
    console.log("Purchase restore requested, but RevenueCat is not configured in this build.");
    return [];
  }
  const { customerInfo } = await purchases.Purchases.restorePurchases();
  return hasProEntitlement(customerInfo) ? [PRODUCT_IDS.proLabPack] : [];
}
