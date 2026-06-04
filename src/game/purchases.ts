import { Capacitor } from "@capacitor/core";
import { Purchases as RevenueCatPurchases } from "@revenuecat/purchases-capacitor";
import { APP_STORE_PURCHASE_PRODUCT_IDS, PRODUCT_IDS, ProductId, getProductById } from "./products";

type CustomerInfo = {
  entitlements?: { active?: Record<string, unknown> };
  managementURL?: string | null;
  managementUrl?: string | null;
};

type PurchasesStoreProduct = { identifier: string };
type PurchasesPackage = { identifier: string; product: PurchasesStoreProduct };
type PurchasesOffering = {
  identifier: string;
  availablePackages?: PurchasesPackage[];
  lifetime?: PurchasesPackage | null;
};
type PurchasesPlugin = {
  setLogLevel: (options: { level: string }) => Promise<void>;
  configure: (options: { apiKey: string }) => Promise<void>;
  getOfferings: () => Promise<{
    current?: PurchasesOffering | null;
    all?: Record<string, PurchasesOffering>;
  }>;
  getProducts: (options: {
    productIdentifiers: string[];
    type: string;
  }) => Promise<{ products: PurchasesStoreProduct[] }>;
  getCustomerInfo: () => Promise<{ customerInfo: CustomerInfo }>;
  addCustomerInfoUpdateListener: (
    listener: (customerInfo: CustomerInfo) => void,
  ) => Promise<string>;
  removeCustomerInfoUpdateListener: (options: { listenerToRemove: string }) => Promise<unknown>;
  purchaseStoreProduct: (options: {
    product: PurchasesStoreProduct;
  }) => Promise<{ customerInfo: CustomerInfo }>;
  purchasePackage: (options: {
    aPackage: PurchasesPackage;
  }) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<{ customerInfo: CustomerInfo }>;
};

const DEFAULT_PRO_ENTITLEMENT = "atomic_fusion_lifetime";
const DEFAULT_OFFERING_ID = "default";
const NATIVE_SETUP_TIMEOUT_MS = 30_000;
const NATIVE_PURCHASE_TIMEOUT_MS = 60_000;

let configured = false;
let purchasesPlugin: PurchasesPlugin | null = null;
let customerInfoListenerId: string | null = null;
let missingConfigLogged = false;
let lastConfigurationReason = "";
let lastStoreProductLookupReason = "";

export type PurchaseGoldCoinResult = {
  coins: number;
  reason?: string;
};

export type PurchaseProductResult = {
  purchased: boolean;
  reason?: string;
};

export type PurchaseWarmupResult = {
  configured: boolean;
  hasProPack: boolean;
  offeringId: string;
  entitlementId: string;
  packageIdentifiers: string[];
  storeProductIdentifiers: string[];
  reason?: string;
};

type PurchaseStepReporter = (message: string) => void;

let lastPackageLookupReason = "";

function envFlagEnabled(value: unknown): boolean {
  return typeof value === "string" && /^(1|true|yes|on)$/i.test(value.trim());
}

async function withNativeTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

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
    configuredEnvValue(import.meta.env.VITE_RC_IOS_API_KEY)
  );
}

function getEntitlementId(): string {
  return import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID ?? DEFAULT_PRO_ENTITLEMENT;
}

function getOfferingId(): string {
  return import.meta.env.VITE_REVENUECAT_OFFERING_ID ?? DEFAULT_OFFERING_ID;
}

function shouldEnableRevenueCatDebugLogs(): boolean {
  return !import.meta.env.PROD || envFlagEnabled(import.meta.env.VITE_REVENUECAT_DEBUG_LOGS);
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
    .filter(
      (value): value is string | number => typeof value === "string" || typeof value === "number",
    )
    .map(String)
    .filter(Boolean);

  return fields.join(": ");
}

function purchaseSetupHint(reason: string): string {
  const base = reason || "The App Store purchase sheet did not respond.";
  if (!/timed out|timeout/i.test(base)) return base;
  return `${base} Check that the App Store product is available for this bundle ID, included in RevenueCat offering '${getOfferingId()}', and ready for TestFlight sandbox purchases.`;
}

function summarizePackages(packages: PurchasesPackage[]): string {
  if (!packages.length) return "none";
  return packages
    .map((pkg) => `${pkg.identifier} / ${pkg.product.identifier}`)
    .slice(0, 6)
    .join(", ");
}

function summarizeStoreProducts(products: PurchasesStoreProduct[]): string {
  if (!products.length) return "none";
  return products
    .map((product) => product.identifier)
    .slice(0, 8)
    .join(", ");
}

async function ensureConfigured(
  reportStep?: PurchaseStepReporter,
): Promise<PurchasesPlugin | null> {
  if (!isNativePlatform()) return null;
  if (configured) return purchasesPlugin;
  const Purchases = RevenueCatPurchases as unknown as PurchasesPlugin;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    if (!missingConfigLogged) {
      console.warn(
        "RevenueCat API key is missing. Set VITE_REVENUECAT_IOS_API_KEY (or VITE_REVENUECAT_API_KEY) in iOS release builds.",
      );
      missingConfigLogged = true;
    }
    lastConfigurationReason =
      "RevenueCat is not configured in this build. Add VITE_REVENUECAT_IOS_API_KEY in Codemagic.";
    return null;
  }
  lastConfigurationReason = "";
  try {
    if (shouldEnableRevenueCatDebugLogs()) {
      reportStep?.("Preparing purchase logs...");
      await withNativeTimeout(
        Purchases.setLogLevel({ level: "DEBUG" }),
        NATIVE_SETUP_TIMEOUT_MS,
        "RevenueCat log setup",
      );
    }
    reportStep?.("Connecting to App Store purchases...");
    await withNativeTimeout(
      Purchases.configure({ apiKey }),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat configuration",
    );
    configured = true;
    purchasesPlugin = Purchases;
    console.log("RevenueCat configured for native purchases.", {
      platform: Capacitor.getPlatform(),
      offeringId: getOfferingId(),
      entitlementId: getEntitlementId(),
      apiKeyPrefix: `${apiKey.slice(0, 8)}...`,
    });
    return Purchases;
  } catch (error) {
    lastConfigurationReason =
      describePurchaseError(error) || "RevenueCat could not be initialized in this build.";
    console.log("RevenueCat configuration failed.", { error, reason: lastConfigurationReason });
    return null;
  }
}

async function findPackage(
  productId: ProductId,
  reportStep?: PurchaseStepReporter,
): Promise<PurchasesPackage | null> {
  lastPackageLookupReason = "";
  const purchases = await ensureConfigured(reportStep);
  if (!purchases) {
    lastPackageLookupReason =
      lastConfigurationReason || "RevenueCat is not configured in this build.";
    return null;
  }

  let offerings;
  try {
    reportStep?.("Loading available products...");
    offerings = await withNativeTimeout(
      purchases.getOfferings(),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat offerings lookup",
    );
  } catch (error) {
    lastPackageLookupReason =
      describePurchaseError(error) ||
      "RevenueCat offerings could not be loaded. Check the RevenueCat app setup.";
    console.log("RevenueCat offerings lookup failed.", { productId, error });
    return null;
  }

  const offeringId = getOfferingId();
  const preferred =
    offerings.current?.identifier === offeringId
      ? offerings.current
      : (offerings.all?.[offeringId] ?? offerings.current);

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

async function findStoreProduct(
  productId: ProductId,
  reportStep?: PurchaseStepReporter,
): Promise<PurchasesStoreProduct | null> {
  lastStoreProductLookupReason = "";
  const purchases = await ensureConfigured(reportStep);
  if (!purchases) {
    lastStoreProductLookupReason =
      lastConfigurationReason || "RevenueCat could not be initialized for App Store products.";
    return null;
  }

  try {
    reportStep?.("Loading App Store product...");
    const { products } = await withNativeTimeout(
      purchases.getProducts({
        productIdentifiers: [productId],
        type: "NON_SUBSCRIPTION",
      }),
      NATIVE_SETUP_TIMEOUT_MS,
      "App Store product lookup",
    );

    const product = products.find((entry) => entry.identifier === productId) ?? products[0] ?? null;
    if (!product) {
      lastStoreProductLookupReason = `Product '${productId}' was not returned by App Store. Returned products: ${summarizeStoreProducts(products)}.`;
      return null;
    }
    return product;
  } catch (error) {
    lastStoreProductLookupReason =
      describePurchaseError(error) ||
      "App Store product lookup failed. Check product IDs and App Store Connect status.";
    return null;
  }
}

export async function initPurchases(): Promise<boolean> {
  const purchases = await ensureConfigured();
  if (!purchases) return false;
  const { customerInfo } = await withNativeTimeout(
    purchases.getCustomerInfo(),
    NATIVE_SETUP_TIMEOUT_MS,
    "RevenueCat customer info lookup",
  );
  return hasProEntitlement(customerInfo);
}

export async function warmUpPurchases(
  reportStep?: PurchaseStepReporter,
): Promise<PurchaseWarmupResult> {
  const offeringId = getOfferingId();
  const entitlementId = getEntitlementId();

  if (!isNativePlatform()) {
    return {
      configured: false,
      hasProPack: false,
      offeringId,
      entitlementId,
      packageIdentifiers: [],
      storeProductIdentifiers: [],
      reason: "Native App Store purchases are only available in the iOS app.",
    };
  }

  const purchases = await ensureConfigured(reportStep);
  if (!purchases) {
    return {
      configured: false,
      hasProPack: false,
      offeringId,
      entitlementId,
      packageIdentifiers: [],
      storeProductIdentifiers: [],
      reason: lastConfigurationReason || "RevenueCat could not be initialized.",
    };
  }

  let hasProPack = false;
  let packageIdentifiers: string[] = [];
  let storeProductIdentifiers: string[] = [];
  let reason = "";

  try {
    reportStep?.("Checking purchase status...");
    const { customerInfo } = await withNativeTimeout(
      purchases.getCustomerInfo(),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat customer info warm-up",
    );
    hasProPack = hasProEntitlement(customerInfo);
  } catch (error) {
    reason = describePurchaseError(error) || "Customer info warm-up failed.";
    console.log("RevenueCat customer info warm-up failed.", { error, reason });
  }

  try {
    reportStep?.("Preloading RevenueCat offering...");
    const offerings = await withNativeTimeout(
      purchases.getOfferings(),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat offerings warm-up",
    );
    const preferred =
      offerings.current?.identifier === offeringId
        ? offerings.current
        : (offerings.all?.[offeringId] ?? offerings.current);
    packageIdentifiers = (preferred?.availablePackages ?? []).map(
      (pkg) => `${pkg.identifier} / ${pkg.product.identifier}`,
    );
    if (!packageIdentifiers.length) {
      reason = reason || `RevenueCat offering '${offeringId}' returned no packages.`;
    }
  } catch (error) {
    reason = reason || describePurchaseError(error) || "RevenueCat offerings warm-up failed.";
    console.log("RevenueCat offerings warm-up failed.", { error, reason });
  }

  try {
    reportStep?.("Preloading App Store products...");
    const { products } = await withNativeTimeout(
      purchases.getProducts({
        productIdentifiers: [...APP_STORE_PURCHASE_PRODUCT_IDS],
        type: "NON_SUBSCRIPTION",
      }),
      NATIVE_SETUP_TIMEOUT_MS,
      "App Store products warm-up",
    );
    storeProductIdentifiers = products.map((product) => product.identifier);
    if (!storeProductIdentifiers.length) {
      reason = reason || "App Store product warm-up returned no products.";
    }
  } catch (error) {
    reason = reason || describePurchaseError(error) || "App Store products warm-up failed.";
    console.log("App Store products warm-up failed.", { error, reason });
  }

  console.log("Native purchase warm-up complete.", {
    configured: true,
    hasProPack,
    offeringId,
    entitlementId,
    packages: packageIdentifiers,
    products: storeProductIdentifiers,
    reason,
  });

  return {
    configured: true,
    hasProPack,
    offeringId,
    entitlementId,
    packageIdentifiers,
    storeProductIdentifiers,
    reason: reason || undefined,
  };
}

export async function syncCustomerInfoEntitlement(): Promise<boolean> {
  const purchases = await ensureConfigured();
  if (!purchases) return false;
  const { customerInfo } = await withNativeTimeout(
    purchases.getCustomerInfo(),
    NATIVE_SETUP_TIMEOUT_MS,
    "RevenueCat customer info sync",
  );
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
    const { customerInfo } = await withNativeTimeout(
      purchases.getCustomerInfo(),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat customer management lookup",
    );
    const managementURL =
      (
        customerInfo as CustomerInfo & {
          managementURL?: string | null;
          managementUrl?: string | null;
        }
      ).managementURL ??
      (
        customerInfo as CustomerInfo & {
          managementURL?: string | null;
          managementUrl?: string | null;
        }
      ).managementUrl;
    if (!managementURL) return false;

    window.open(managementURL, "_blank", "noopener,noreferrer");
    return true;
  } catch (error) {
    console.log("Customer purchase management could not be opened.", { error });
    return false;
  }
}

export async function purchaseProductWithResult(
  productId: ProductId,
  reportStep?: PurchaseStepReporter,
): Promise<PurchaseProductResult> {
  const product = getProductById(productId);
  if (!product || product.type !== "non_consumable") {
    return { purchased: false, reason: "Invalid App Store product configuration." };
  }
  if (!isNativePlatform()) {
    return {
      purchased: false,
      reason: "App Store purchases are only available in the iPhone app.",
    };
  }

  const purchases = await ensureConfigured(reportStep);
  if (!purchases) {
    const reason =
      lastConfigurationReason ||
      "Native App Store purchase support is not available in this build.";
    console.log("Native App Store purchase support is not available in this build.", {
      productId,
      reason,
    });
    return { purchased: false, reason };
  }

  const [storeProduct, packageToPurchase] = await Promise.all([
    findStoreProduct(productId, reportStep),
    findPackage(productId, reportStep),
  ]);

  if (!storeProduct && !packageToPurchase) {
    const reason =
      lastStoreProductLookupReason ||
      lastPackageLookupReason ||
      "Native App Store purchase support is not available in this build.";
    console.log("Native App Store purchase support is not available in this build.", {
      productId,
      reason,
    });
    return { purchased: false, reason };
  }

  try {
    reportStep?.("Waiting for App Store confirmation...");
    const purchaseResult = storeProduct
      ? await withNativeTimeout(
          purchases.purchaseStoreProduct({
            product: storeProduct,
          }),
          NATIVE_PURCHASE_TIMEOUT_MS,
          "App Store purchase",
        )
      : await withNativeTimeout(
          purchases.purchasePackage({
            aPackage: packageToPurchase!,
          }),
          NATIVE_PURCHASE_TIMEOUT_MS,
          "App Store purchase",
        );
    const { customerInfo } = purchaseResult;
    if (productId !== PRODUCT_IDS.proLabPack) return { purchased: true };
    if (hasProEntitlement(customerInfo)) return { purchased: true };
    return {
      purchased: false,
      reason: `Purchase completed, but entitlement '${getEntitlementId()}' is not active yet. Try Restore after a moment.`,
    };
  } catch (error) {
    if (!storeProduct || !packageToPurchase) {
      const reason = purchaseSetupHint(
        describePurchaseError(error) || "App Store purchase could not be completed right now.",
      );
      console.log("Native App Store purchase could not be completed.", {
        productId,
        error,
        reason,
      });
      return { purchased: false, reason };
    }

    try {
      reportStep?.("Retrying purchase route...");
      const { customerInfo } = await withNativeTimeout(
        purchases.purchasePackage({
          aPackage: packageToPurchase,
        }),
        NATIVE_PURCHASE_TIMEOUT_MS,
        "App Store purchase retry",
      );
      if (productId !== PRODUCT_IDS.proLabPack) return { purchased: true };
      if (hasProEntitlement(customerInfo)) return { purchased: true };
      return {
        purchased: false,
        reason: `Purchase completed, but entitlement '${getEntitlementId()}' is not active yet. Try Restore after a moment.`,
      };
    } catch (fallbackError) {
      const reason = purchaseSetupHint(
        describePurchaseError(fallbackError) ||
          describePurchaseError(error) ||
          "App Store purchase could not be completed right now.",
      );
      console.log("Native App Store purchase could not be completed.", {
        productId,
        error,
        fallbackError,
        reason,
      });
      return { purchased: false, reason };
    }
  }
}

export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  const result = await purchaseProductWithResult(productId);
  return result.purchased;
}

export async function purchaseGoldCoinPack(
  productId: ProductId,
  reportStep?: PurchaseStepReporter,
): Promise<PurchaseGoldCoinResult> {
  const product = getProductById(productId);
  if (!product || product.type !== "consumable" || !product.coins) {
    return { coins: 0, reason: "Invalid product configuration." };
  }
  if (!isNativePlatform()) {
    return { coins: 0, reason: "App Store purchases are only available in the iPhone app." };
  }
  const purchases = await ensureConfigured(reportStep);
  if (!purchases) {
    return {
      coins: 0,
      reason:
        lastConfigurationReason ||
        "RevenueCat is not configured in this build. Add VITE_REVENUECAT_IOS_API_KEY in Codemagic.",
    };
  }
  const [storeProduct, packageToPurchase] = await Promise.all([
    findStoreProduct(productId, reportStep),
    findPackage(productId, reportStep),
  ]);
  if (!storeProduct && !packageToPurchase) {
    return {
      coins: 0,
      reason:
        lastStoreProductLookupReason ||
        lastPackageLookupReason ||
        `Product not found in RevenueCat offering '${getOfferingId()}'. Check product IDs and offering setup.`,
    };
  }
  try {
    reportStep?.("Waiting for App Store confirmation...");
    if (storeProduct) {
      await withNativeTimeout(
        purchases.purchaseStoreProduct({ product: storeProduct }),
        NATIVE_PURCHASE_TIMEOUT_MS,
        "App Store coin purchase",
      );
    } else {
      await withNativeTimeout(
        purchases.purchasePackage({ aPackage: packageToPurchase! }),
        NATIVE_PURCHASE_TIMEOUT_MS,
        "App Store coin purchase",
      );
    }
    return { coins: product.coins };
  } catch (error) {
    if (storeProduct && packageToPurchase) {
      try {
        reportStep?.("Retrying purchase route...");
        await withNativeTimeout(
          purchases.purchasePackage({ aPackage: packageToPurchase }),
          NATIVE_PURCHASE_TIMEOUT_MS,
          "App Store coin purchase retry",
        );
        return { coins: product.coins };
      } catch (fallbackError) {
        const message = purchaseSetupHint(
          describePurchaseError(fallbackError) ||
            describePurchaseError(error) ||
            "App Store purchase could not be completed right now.",
        );
        return { coins: 0, reason: message };
      }
    }
    const message = purchaseSetupHint(
      describePurchaseError(error) || "App Store purchase could not be completed right now.",
    );
    return { coins: 0, reason: message };
  }
}

export async function restorePurchases(): Promise<ProductId[]> {
  const purchases = await ensureConfigured();
  if (!purchases) {
    console.log("Purchase restore requested, but RevenueCat is not configured in this build.");
    return [];
  }
  const { customerInfo } = await withNativeTimeout(
    purchases.restorePurchases(),
    NATIVE_SETUP_TIMEOUT_MS,
    "RevenueCat restore purchases",
  );
  return hasProEntitlement(customerInfo) ? [PRODUCT_IDS.proLabPack] : [];
}
