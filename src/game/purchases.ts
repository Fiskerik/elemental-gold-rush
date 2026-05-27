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

export type PurchaseProductResult = {
  purchased: boolean;
  reason?: string;
};

let lastPackageLookupReason = "";

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

function describePurchaseError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";

  const details = error as {
    code?: unknown;
    message?: unknown;
    readableErrorCode?: unknown;
    readable_error_code?: unknown;
    underlyingErrorMessage?: unknown;
    userCancelled?: unknown;
  };
  if (details.userCancelled === true) return "Purchase cancelled.";

  const fields = [
    details.readableErrorCode,
    details.readable_error_code,
    details.code,
    details.message,
    details.underlyingErrorMessage,
  ]
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map(String)
    .filter(Boolean);

  return fields.join(": ");
}

function summarizePackages(packages: PurchasesPackage[]): string {
  if (!packages.length) return "none";
  return packages
    .map((pkg) => `${pkg.identifier} / ${pkg.product.identifier}`)
    .slice(0, 6)
    .join(", ");
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
  lastPackageLookupReason = "";
  const purchases = await ensureConfigured();
  if (!purchases) return null;

  let offerings;
  try {
    offerings = await purchases.getOfferings();
  } catch (error) {
    lastPackageLookupReason =
      describePurchaseError(error) || "RevenueCat offerings could not be loaded. Check the RevenueCat app setup.";
    console.log("RevenueCat offerings lookup failed.", { productId, error });
    return null;
  }

  const offeringId = getOfferingId();
  const preferred =
    offerings.current?.identifier === offeringId
      ? offerings.current
      : offerings.all?.[offeringId] ?? offerings.current;

  if (!preferred) {
    lastPackageLookupReason = `No RevenueCat offering was returned. Expected offering '${offeringId}'.`;
    return null;
  }

  const packages = preferred?.availablePackages ?? [];
  if (!packages.length) {
    lastPackageLookupReason = `RevenueCat offering '${preferred.identifier}' has no packages. Add your App Store products to that offering.`;
    return null;
  }

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
  if (!product?.coins) {
    lastPackageLookupReason = `Product '${productId}' is not configured as a coin pack in the app.`;
    return null;
  }

  const normalizedNeedles = [
    `coins${product.coins}`,
    `coin${product.coins}`,
    `${product.coins}coins`,
    `${product.coins}coin`,
  ];

  const matchedPackage =
    packages.find((pkg) => {
      const productToken = normalize(pkg.product.identifier);
      const packageToken = normalize(pkg.identifier);
      return normalizedNeedles.some(
        (needle) => productToken.includes(needle) || packageToken.includes(needle),
      );
    }) ?? null;

  if (!matchedPackage) {
    lastPackageLookupReason = `Product '${productId}' was not found in RevenueCat offering '${preferred.identifier}'. Available packages: ${summarizePackages(packages)}.`;
  }

  return matchedPackage;
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
  const result = await purchaseProductWithResult(PRODUCT_IDS.proLabPack);
  return result.purchased;
}

export async function presentCustomerCenter(): Promise<boolean> {
  const purchases = await ensureConfigured();
  if (!purchases) return false;

  try {
    const { customerInfo } = await purchases.getCustomerInfo();
    const managementURL =
      (customerInfo as CustomerInfo & { managementURL?: string | null; managementUrl?: string | null })
        .managementURL ??
      (customerInfo as CustomerInfo & { managementURL?: string | null; managementUrl?: string | null })
        .managementUrl;
    if (!managementURL) return false;

    window.open(managementURL, "_blank", "noopener,noreferrer");
    return true;
  } catch (error) {
    console.log("Customer purchase management could not be opened.", { error });
    return false;
  }
}

export async function purchaseProductWithResult(productId: ProductId): Promise<PurchaseProductResult> {
  const product = getProductById(productId);
  if (!product || product.type !== "non_consumable") {
    return { purchased: false, reason: "Invalid App Store product configuration." };
  }
  if (!isNativePlatform()) {
    return { purchased: false, reason: "App Store purchases are only available in the iPhone app." };
  }

  const purchases = await ensureConfigured();
  const packageToPurchase = await findPackage(productId);
  if (!purchases || !packageToPurchase) {
    const reason =
      lastPackageLookupReason || "Native App Store purchase support is not available in this build.";
    console.log("Native App Store purchase support is not available in this build.", {
      productId,
      reason,
    });
    return { purchased: false, reason };
  }

  try {
    const { customerInfo } = await purchases.purchasePackage({
      aPackage: packageToPurchase,
    });
    if (productId !== PRODUCT_IDS.proLabPack) return { purchased: true };
    if (hasProEntitlement(customerInfo)) return { purchased: true };
    return {
      purchased: false,
      reason: `Purchase completed, but entitlement '${getEntitlementId()}' is not active yet. Try Restore after a moment.`,
    };
  } catch (error) {
    const reason = describePurchaseError(error) || "App Store purchase could not be completed right now.";
    console.log("Native App Store purchase could not be completed.", { productId, error, reason });
    return { purchased: false, reason };
  }
}

export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  const result = await purchaseProductWithResult(productId);
  return result.purchased;
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
    return {
      coins: 0,
      reason:
        lastPackageLookupReason ||
        `Product not found in RevenueCat offering '${getOfferingId()}'. Check product IDs and offering setup.`,
    };
  }
  try {
    await purchases.purchasePackage({ aPackage: packageToPurchase });
    return { coins: product.coins };
  } catch (error) {
    const message = describePurchaseError(error) || "App Store purchase could not be completed right now.";
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
