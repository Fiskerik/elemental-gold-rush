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

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function getRevenueCatApiKey(): string {
  return (
    import.meta.env.VITE_REVENUECAT_API_KEY ??
    import.meta.env.VITE_REVENUECAT_IOS_API_KEY ??
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

  const offerings = await purchases.Purchases.getOfferings();
  const offeringId = getOfferingId();
  const preferred =
    offerings.current?.identifier === offeringId
      ? offerings.current
      : offerings.all?.[offeringId] ?? offerings.current;

  return (
    preferred?.availablePackages?.find((pkg) => pkg.product.identifier === productId) ??
    preferred?.availablePackages?.find((pkg) => pkg.identifier === productId) ??
    null
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
