import { Capacitor } from "@capacitor/core";
import {
  LOG_LEVEL,
  Purchases,
  type CustomerInfo,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { PRODUCT_IDS, ProductId, getProductById } from "./products";
const FALLBACK_REVENUECAT_IOS_API_KEY = "appl_wleIrbzZnDKaUaQgnbmYbTYVxfX";
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

function configuredEnvValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : "";
}

function getRevenueCatApiKey(): string {
  return (
    configuredEnvValue(import.meta.env.VITE_REVENUECAT_IOS_API_KEY) ||
    configuredEnvValue(import.meta.env.VITE_REVENUECAT_API_KEY) ||
    configuredEnvValue(import.meta.env.VITE_RC_IOS_API_KEY) ||
    FALLBACK_REVENUECAT_IOS_API_KEY
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

async function ensureConfigured(): Promise<typeof Purchases | null> {
  if (!isNativePlatform()) return null;
  if (configured) return Purchases;

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
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }
  await Purchases.configure({ apiKey });
  configured = true;
  return Purchases;
}

async function findPackage(productId: ProductId): Promise<PurchasesPackage | null> {
  const purchases = await ensureConfigured();
  if (!purchases) return null;

  const offerings = await purchases.getOfferings();
  const offeringId = getOfferingId();
  const preferred =
    offerings.current?.identifier === offeringId
      ? offerings.current
      : offerings.all?.[offeringId] ?? offerings.current;

  const packages = preferred?.availablePackages ?? [];
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (productId === PRODUCT_IDS.proLabPack) {
    const lifetimePackage =
      preferred?.lifetime ??
      packages.find((pkg) => {
        const productToken = normalize(pkg.product.identifier);
        const packageToken = normalize(pkg.identifier);
        return productToken.includes("lifetime") || packageToken.includes("lifetime");
      }) ??
      null;
    if (lifetimePackage) return lifetimePackage;
  }

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
  const { customerInfo } = await purchases.getCustomerInfo();
  return hasProEntitlement(customerInfo);
}

export async function syncCustomerInfoEntitlement(): Promise<boolean> {
  const purchases = await ensureConfigured();
  if (!purchases) return false;
  const { customerInfo } = await purchases.getCustomerInfo();
  return hasProEntitlement(customerInfo);
}

export async function setCustomerInfoListener(
  onEntitlementChanged: (hasEntitlement: boolean) => void,
): Promise<void> {
  const purchases = await ensureConfigured();
  if (!purchases) return;
  if (customerInfoListenerId) return;

  customerInfoListenerId = await purchases.addCustomerInfoUpdateListener((customerInfo) => {
    onEntitlementChanged(hasProEntitlement(customerInfo));
  });
}

export async function clearCustomerInfoListener(): Promise<void> {
  const purchases = await ensureConfigured();
  if (!purchases || !customerInfoListenerId) return;
  await purchases.removeCustomerInfoUpdateListener({
    listenerToRemove: customerInfoListenerId,
  });
  customerInfoListenerId = null;
}

export async function presentPaywallIfNeeded(): Promise<boolean> {
  return purchaseProduct(PRODUCT_IDS.proLabPack);
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
  try {
    const { customerInfo } = await purchases.purchasePackage({
      aPackage: packageToPurchase,
    });
    return productId === PRODUCT_IDS.proLabPack ? hasProEntitlement(customerInfo) : true;
  } catch (error) {
    console.log("Native App Store purchase could not be completed.", { productId, error });
    return false;
  }
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
    await purchases.purchasePackage({ aPackage: packageToPurchase });
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
  const { customerInfo } = await purchases.restorePurchases();
  return hasProEntitlement(customerInfo) ? [PRODUCT_IDS.proLabPack] : [];
}
