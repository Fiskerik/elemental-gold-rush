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

type PurchasesModule = {
  Purchases: {
    configure: (options: { apiKey: string }) => Promise<void>;
    getCustomerInfo: () => Promise<{ customerInfo: CustomerInfo }>;
    getOfferings: () => Promise<{ current?: { availablePackages?: RevenueCatPackage[] } | null }>;
    purchasePackage: (options: { aPackage: RevenueCatPackage }) => Promise<{ customerInfo: CustomerInfo }>;
    restorePurchases: () => Promise<{ customerInfo: CustomerInfo }>;
    setLogLevel?: (options: { level: string }) => Promise<void>;
  };
  LOG_LEVEL?: {
    DEBUG?: string;
    INFO?: string;
  };
};

const PURCHASES_MODULE = "@revenuecat/purchases-capacitor";
const PRO_ENTITLEMENT = "pro";

let configured = false;

async function loadPurchases(): Promise<PurchasesModule | null> {
  try {
    return (await import(/* @vite-ignore */ PURCHASES_MODULE)) as PurchasesModule;
  } catch {
    return null;
  }
}

function getRevenueCatApiKey(): string {
  return import.meta.env.VITE_REVENUECAT_IOS_API_KEY ?? "";
}

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements?.active?.[PRO_ENTITLEMENT]);
}

async function ensureConfigured(): Promise<PurchasesModule | null> {
  const purchases = await loadPurchases();
  if (!purchases) return null;
  if (configured) return purchases;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return null;
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
  const { current } = await purchases.Purchases.getOfferings();
  return (
    current?.availablePackages?.find((pkg) => pkg.product.identifier === productId) ??
    current?.availablePackages?.find((pkg) => pkg.identifier === productId) ??
    null
  );
}

export async function initPurchases(): Promise<boolean> {
  const purchases = await ensureConfigured();
  if (!purchases) return false;
  const { customerInfo } = await purchases.Purchases.getCustomerInfo();
  return hasProEntitlement(customerInfo);
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

export async function purchaseGoldCoinPack(productId: ProductId): Promise<number> {
  const product = getProductById(productId);
  if (!product || product.type !== "consumable" || !product.coins) return 0;
  const purchases = await ensureConfigured();
  const packageToPurchase = await findPackage(productId);
  if (!purchases || !packageToPurchase) {
    console.log("Native App Store coin purchases are not available in this build.", { productId });
    return 0;
  }
  await purchases.Purchases.purchasePackage({ aPackage: packageToPurchase });
  return product.coins;
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
