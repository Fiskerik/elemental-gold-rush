import { Capacitor } from "@capacitor/core";
import { Purchases as RevenueCatPurchases } from "@revenuecat/purchases-capacitor";
import { logDebug } from "../lib/debugLogger";
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
  isConfigured?: () => Promise<{ isConfigured?: boolean } | boolean>;
  setLogLevel: (options: { level: string }) => Promise<void>;
  configure: (options: { apiKey: string }) => Promise<void>;
  canMakePayments?: () => Promise<{ canMakePayments: boolean }>;
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
const NATIVE_SETUP_TIMEOUT_MS = 15_000;
const NATIVE_PURCHASE_TIMEOUT_MS = 20_000;
const DEBUG_SETUP_TIMEOUT_MS = 10_000;
const DEBUG_PURCHASE_TIMEOUT_MS = 15_000;

let configured = false;
let purchasesPlugin: PurchasesPlugin | null = null;
let configurationPromise: Promise<boolean> | null = null;
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
  canMakePayments?: boolean;
  reason?: string;
};

export type PurchaseDebugSnapshot = PurchaseWarmupResult & {
  platform: string;
  isConfigured?: boolean;
  activeEntitlements: string[];
};

type PurchaseStepReporter = (message: string) => void;

let lastPackageLookupReason = "";

function envFlagEnabled(value: unknown): boolean {
  return typeof value === "string" && /^(1|true|yes|on)$/i.test(value.trim());
}

async function withNativeTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: number | undefined;
  const effectiveTimeoutMs =
    isPurchaseDebugUiEnabled() && timeoutMs === NATIVE_SETUP_TIMEOUT_MS
      ? DEBUG_SETUP_TIMEOUT_MS
      : isPurchaseDebugUiEnabled() && timeoutMs === NATIVE_PURCHASE_TIMEOUT_MS
        ? DEBUG_PURCHASE_TIMEOUT_MS
        : timeoutMs;
  purchaseDebugLog(`${label} started.`, {
    timeoutSeconds: Math.round(effectiveTimeoutMs / 1000),
  });
  try {
    const operationPromise = Promise.resolve().then(operation);
    const result = await Promise.race([
      operationPromise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          const error = new Error(
            `${label} timed out after ${Math.round(effectiveTimeoutMs / 1000)} seconds.`,
          );
          purchaseDebugLog(`${label} timed out.`, {
            timeoutSeconds: Math.round(effectiveTimeoutMs / 1000),
          });
          reject(error);
        }, effectiveTimeoutMs);
      }),
    ]);
    purchaseDebugLog(`${label} completed.`);
    return result;
  } catch (error) {
    purchaseDebugLog(`${label} failed.`, { error: summarizeErrorForDebug(error) });
    throw error;
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

export function isPurchaseDebugUiEnabled(): boolean {
  return envFlagEnabled(import.meta.env.VITE_PURCHASE_DEBUG_UI);
}

function purchaseDebugLog(message: string, details?: unknown): void {
  logDebug(message, details);
}

function showPurchaseDebugAlert(title: string, details: string): void {
  if (!isPurchaseDebugUiEnabled()) return;
  window.alert(`${title}\n\n${details}`);
}

function stringifyForDebug(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summarizeErrorForDebug(error: unknown): string {
  const message = describePurchaseError(error);
  const raw = stringifyForDebug(error);
  return message && raw && raw !== "{}" ? `${message}\n\n${raw}` : message || raw;
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
  return `${base} This usually means the product is not available to StoreKit in this build. Check that the IAPs are attached to the App Store version/build, submitted for review, available for this bundle ID, included in RevenueCat offering '${getOfferingId()}', and ready for TestFlight sandbox purchases.`;
}

function isTimeoutReason(reason: string): boolean {
  return /timed out|timeout/i.test(reason);
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

async function checkSdkConfigured(purchases: PurchasesPlugin): Promise<boolean | undefined> {
  if (!purchases.isConfigured) return configured;
  try {
    const result = await purchases.isConfigured();
    if (typeof result === "boolean") return result;
    if (typeof result?.isConfigured === "boolean") return result.isConfigured;
  } catch (error) {
    purchaseDebugLog("RevenueCat isConfigured check failed.", error);
  }
  return configured;
}

async function checkCanMakePayments(
  purchases: PurchasesPlugin,
  reportStep?: PurchaseStepReporter,
): Promise<boolean | undefined> {
  if (!purchases.canMakePayments) return undefined;
  try {
    reportStep?.("Checking App Store purchase permission...");
    const result = await withNativeTimeout(
      () => purchases.canMakePayments!(),
      NATIVE_SETUP_TIMEOUT_MS,
      "App Store purchase permission check",
    );
    purchaseDebugLog("App Store purchase permission check returned.", result);
    return result.canMakePayments;
  } catch (error) {
    purchaseDebugLog("App Store purchase permission check failed.", {
      error: summarizeErrorForDebug(error),
    });
    return undefined;
  }
}

async function ensureConfigured(reportStep?: PurchaseStepReporter): Promise<boolean> {
  if (!isNativePlatform()) return false;

  if (configured && purchasesPlugin) {
    purchaseDebugLog("RevenueCat already configured; reusing native purchases instance.");
    return true;
  }

  if (configured && !purchasesPlugin) {
    purchaseDebugLog(
      "RevenueCat configured flag set without native purchases instance; reconnecting.",
    );
    configured = false;
  }

  if (!configurationPromise) {
    purchaseDebugLog("RevenueCat configuration promise created.");
    configurationPromise = configurePurchases(reportStep);
  } else {
    purchaseDebugLog("RevenueCat configuration already in progress; waiting for existing setup.");
  }

  const activeConfigurationPromise = configurationPromise;
  try {
    await activeConfigurationPromise;
  } finally {
    if (configurationPromise === activeConfigurationPromise) {
      configurationPromise = null;
    }
  }

  if (configured && purchasesPlugin) {
    purchaseDebugLog("RevenueCat configuration promise resolved; native purchases ready.");
    return true;
  }

  purchaseDebugLog("RevenueCat configuration promise resolved without native purchases instance.", {
    reason: lastConfigurationReason,
  });
  return false;
}

async function configurePurchases(reportStep?: PurchaseStepReporter): Promise<boolean> {
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
    return false;
  }
  lastConfigurationReason = "";
  try {
    if (shouldEnableRevenueCatDebugLogs()) {
      reportStep?.("Preparing purchase logs...");
      await withNativeTimeout(
        () => Purchases.setLogLevel({ level: "DEBUG" }),
        NATIVE_SETUP_TIMEOUT_MS,
        "RevenueCat log setup",
      );
    }
    reportStep?.("Connecting to App Store purchases...");
    await withNativeTimeout(
      () => Purchases.configure({ apiKey }),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat configuration",
    );
    configured = true;
    purchasesPlugin = Purchases;
    purchaseDebugLog("RevenueCat configured for native purchases.", {
      platform: Capacitor.getPlatform(),
      offeringId: getOfferingId(),
      entitlementId: getEntitlementId(),
      apiKeyPrefix: `${apiKey.slice(0, 8)}...`,
    });
    purchaseDebugLog("RevenueCat configurePurchases returning configured status.");
    return true;
  } catch (error) {
    lastConfigurationReason =
      describePurchaseError(error) || "RevenueCat could not be initialized in this build.";
    purchaseDebugLog("RevenueCat configuration failed.", {
      error,
      reason: lastConfigurationReason,
    });
    return false;
  }
}

function getConfiguredPurchases(): PurchasesPlugin | null {
  return configured ? purchasesPlugin : null;
}

async function findPackage(
  productId: ProductId,
  reportStep?: PurchaseStepReporter,
): Promise<PurchasesPackage | null> {
  lastPackageLookupReason = "";
  const configuredForPurchases = await ensureConfigured(reportStep);
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) {
    lastPackageLookupReason =
      lastConfigurationReason || "RevenueCat is not configured in this build.";
    return null;
  }

  let offerings;
  try {
    reportStep?.("Fetching current offerings from RevenueCat...");
    purchaseDebugLog("Fetching current offerings from RevenueCat.", {
      productId,
      offeringId: getOfferingId(),
    });
    offerings = await withNativeTimeout(
      () => purchases.getOfferings(),
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
  purchaseDebugLog("Offerings loaded. Available packages.", {
    currentOffering: offerings.current?.identifier ?? null,
    selectedOffering: preferred.identifier,
    packages: packages.map((pkg) => `${pkg.identifier} / ${pkg.product.identifier}`),
  });
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
  const configuredForPurchases = await ensureConfigured(reportStep);
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) {
    lastStoreProductLookupReason =
      lastConfigurationReason || "RevenueCat could not be initialized for App Store products.";
    return null;
  }

  try {
    reportStep?.("Loading App Store product...");
    purchaseDebugLog("Loading StoreKit product.", { productId });
    const { products } = await withNativeTimeout(
      () =>
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
  const configuredForPurchases = await ensureConfigured();
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) return false;
  const { customerInfo } = await withNativeTimeout(
    () => purchases.getCustomerInfo(),
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
      canMakePayments: false,
      reason: "Native App Store purchases are only available in the iOS app.",
    };
  }

  const configuredForPurchases = await ensureConfigured(reportStep);
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) {
    return {
      configured: false,
      hasProPack: false,
      offeringId,
      entitlementId,
      packageIdentifiers: [],
      storeProductIdentifiers: [],
      canMakePayments: undefined,
      reason: lastConfigurationReason || "RevenueCat could not be initialized.",
    };
  }

  let hasProPack = false;
  let packageIdentifiers: string[] = [];
  let storeProductIdentifiers: string[] = [];
  let canMakePayments: boolean | undefined;
  let reason = "";

  canMakePayments = await checkCanMakePayments(purchases, reportStep);
  if (canMakePayments === false) {
    reason =
      "This device or sandbox account cannot make App Store purchases right now. Check Screen Time restrictions, App Store sandbox account, and Paid Apps Agreement status.";
  }

  try {
    reportStep?.("Checking purchase status...");
    const { customerInfo } = await withNativeTimeout(
      () => purchases.getCustomerInfo(),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat customer info warm-up",
    );
    hasProPack = hasProEntitlement(customerInfo);
  } catch (error) {
    reason = describePurchaseError(error) || "Customer info warm-up failed.";
    purchaseDebugLog("RevenueCat customer info warm-up failed.", { error, reason });
  }

  try {
    reportStep?.("Preloading RevenueCat offering...");
    const offerings = await withNativeTimeout(
      () => purchases.getOfferings(),
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
    purchaseDebugLog("RevenueCat offerings warm-up failed.", { error, reason });
  }

  try {
    reportStep?.("Preloading App Store products...");
    const { products } = await withNativeTimeout(
      () =>
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
    purchaseDebugLog("App Store products warm-up failed.", { error, reason });
  }

  purchaseDebugLog("Native purchase warm-up complete.", {
    configured: true,
    hasProPack,
    offeringId,
    entitlementId,
    packages: packageIdentifiers,
    products: storeProductIdentifiers,
    canMakePayments,
    reason,
  });

  return {
    configured: true,
    hasProPack,
    offeringId,
    entitlementId,
    packageIdentifiers,
    storeProductIdentifiers,
    canMakePayments,
    reason: reason || undefined,
  };
}

export async function debugNativePurchases(
  reportStep?: PurchaseStepReporter,
): Promise<PurchaseDebugSnapshot> {
  const warmup = await warmUpPurchases(reportStep);
  const configuredForPurchases = await ensureConfigured(reportStep);
  const purchases = getConfiguredPurchases();
  const snapshot: PurchaseDebugSnapshot = {
    ...warmup,
    platform: Capacitor.getPlatform(),
    isConfigured: Boolean(configuredForPurchases && purchases),
    activeEntitlements: [],
  };

  if (!configuredForPurchases || !purchases) {
    purchaseDebugLog("RevenueCat debug snapshot.", snapshot);
    return snapshot;
  }

  snapshot.isConfigured = await checkSdkConfigured(purchases);
  snapshot.canMakePayments = await checkCanMakePayments(purchases, reportStep);

  try {
    reportStep?.("Reading purchase entitlements...");
    const { customerInfo } = await withNativeTimeout(
      () => purchases.getCustomerInfo(),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat customer info debug lookup",
    );
    snapshot.activeEntitlements = Object.keys(customerInfo.entitlements?.active ?? {});
    snapshot.hasProPack = hasProEntitlement(customerInfo);
  } catch (error) {
    snapshot.reason =
      snapshot.reason || describePurchaseError(error) || "Customer info debug lookup failed.";
    purchaseDebugLog("RevenueCat customer info debug lookup failed.", error);
  }

  purchaseDebugLog("RevenueCat debug snapshot.", snapshot);
  return snapshot;
}

export async function syncCustomerInfoEntitlement(): Promise<boolean> {
  const configuredForPurchases = await ensureConfigured();
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) return false;
  const { customerInfo } = await withNativeTimeout(
    () => purchases.getCustomerInfo(),
    NATIVE_SETUP_TIMEOUT_MS,
    "RevenueCat customer info sync",
  );
  return hasProEntitlement(customerInfo);
}

export async function setCustomerInfoListener(
  onEntitlementChanged: (hasEntitlement: boolean) => void,
): Promise<void> {
  const configuredForPurchases = await ensureConfigured();
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) return;
  if (customerInfoListenerId) return;

  customerInfoListenerId = await purchases.addCustomerInfoUpdateListener((customerInfo) => {
    onEntitlementChanged(hasProEntitlement(customerInfo));
  });
}

export async function clearCustomerInfoListener(): Promise<void> {
  const configuredForPurchases = await ensureConfigured();
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases || !customerInfoListenerId) return;
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
  const configuredForPurchases = await ensureConfigured();
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) return false;

  try {
    const { customerInfo } = await withNativeTimeout(
      () => purchases.getCustomerInfo(),
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

function productPurchaseResultFromCustomerInfo(
  productId: ProductId,
  customerInfo: CustomerInfo,
  context: string,
): PurchaseProductResult {
  purchaseDebugLog(`${context} returned customer info.`, {
    productId,
    activeEntitlements: Object.keys(customerInfo.entitlements?.active ?? {}),
  });
  if (productId !== PRODUCT_IDS.proLabPack) {
    showPurchaseDebugAlert(context, `Product: ${productId}`);
    return { purchased: true };
  }
  if (hasProEntitlement(customerInfo)) {
    showPurchaseDebugAlert(context, `Product: ${productId}\nEntitlement: ${getEntitlementId()}`);
    return { purchased: true };
  }
  const reason = `Purchase completed, but entitlement '${getEntitlementId()}' is not active yet. Try Restore after a moment.`;
  showPurchaseDebugAlert(`${context} missing entitlement`, reason);
  return {
    purchased: false,
    reason,
  };
}

async function refreshCustomerInfoAfterPurchase(
  purchases: PurchasesPlugin,
  fallbackCustomerInfo: CustomerInfo,
  reportStep?: PurchaseStepReporter,
): Promise<CustomerInfo> {
  try {
    reportStep?.("Refreshing purchase status...");
    const { customerInfo } = await withNativeTimeout(
      () => purchases.getCustomerInfo(),
      NATIVE_SETUP_TIMEOUT_MS,
      "RevenueCat customer info post-purchase refresh",
    );
    purchaseDebugLog("Post-purchase customer info refreshed.", {
      activeEntitlements: Object.keys(customerInfo.entitlements?.active ?? {}),
    });
    return customerInfo;
  } catch (error) {
    purchaseDebugLog("Post-purchase customer info refresh failed; using purchase result.", {
      error: summarizeErrorForDebug(error),
    });
    return fallbackCustomerInfo;
  }
}

export async function purchaseProductWithResult(
  productId: ProductId,
  reportStep?: PurchaseStepReporter,
): Promise<PurchaseProductResult> {
  purchaseDebugLog("Starting product purchase.", { productId });
  const product = getProductById(productId);
  if (!product || product.type !== "non_consumable") {
    showPurchaseDebugAlert("Purchase setup error", "Invalid App Store product configuration.");
    return { purchased: false, reason: "Invalid App Store product configuration." };
  }
  if (!isNativePlatform()) {
    showPurchaseDebugAlert(
      "Purchase unavailable",
      "App Store purchases are only available in the iOS app.",
    );
    return {
      purchased: false,
      reason: "App Store purchases are only available in the iPhone app.",
    };
  }

  purchaseDebugLog("Ensuring RevenueCat configuration for product purchase.", { productId });
  const configuredForPurchases = await ensureConfigured(reportStep);
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) {
    const reason =
      lastConfigurationReason ||
      "Native App Store purchase support is not available in this build.";
    console.log("Native App Store purchase support is not available in this build.", {
      productId,
      reason,
    });
    showPurchaseDebugAlert("RevenueCat not configured", reason);
    return { purchased: false, reason };
  }
  purchaseDebugLog("RevenueCat configuration available for product purchase.", { productId });

  const canMakePayments = await checkCanMakePayments(purchases, reportStep);
  if (canMakePayments === false) {
    const reason =
      "This device or sandbox account cannot make App Store purchases right now. Check Screen Time restrictions, App Store sandbox account, and Paid Apps Agreement status.";
    showPurchaseDebugAlert("Purchases unavailable", reason);
    return { purchased: false, reason };
  }

  purchaseDebugLog("Resolving RevenueCat package purchase route.", { productId });
  let packageToPurchase = await findPackage(productId, reportStep);
  let storeProduct: PurchasesStoreProduct | null = null;
  if (!packageToPurchase) {
    purchaseDebugLog("RevenueCat package route unavailable; resolving StoreKit product route.", {
      productId,
      reason: lastPackageLookupReason,
    });
    storeProduct = await findStoreProduct(productId, reportStep);
  }
  purchaseDebugLog("Resolved purchase routes.", {
    productId,
    storeProduct: storeProduct?.identifier ?? null,
    revenueCatPackage: packageToPurchase
      ? `${packageToPurchase.identifier} / ${packageToPurchase.product.identifier}`
      : null,
    lastStoreProductLookupReason,
    lastPackageLookupReason,
  });

  if (!storeProduct && !packageToPurchase) {
    const reason =
      lastStoreProductLookupReason ||
      lastPackageLookupReason ||
      "Native App Store purchase support is not available in this build.";
    console.log("Native App Store purchase support is not available in this build.", {
      productId,
      reason,
    });
    showPurchaseDebugAlert("Product not available", reason);
    return { purchased: false, reason };
  }

  try {
    reportStep?.("Waiting for App Store confirmation...");
    const primaryRoute = packageToPurchase ? "purchasePackage" : "purchaseStoreProduct";
    purchaseDebugLog("Calling App Store purchase route.", {
      route: primaryRoute,
      storeProduct: storeProduct?.identifier ?? null,
      revenueCatPackage: packageToPurchase?.identifier ?? null,
      packageProduct: packageToPurchase?.product.identifier ?? null,
    });
    const purchaseResult = packageToPurchase
      ? await withNativeTimeout(
          () =>
            purchases.purchasePackage({
              aPackage: packageToPurchase,
            }),
          NATIVE_PURCHASE_TIMEOUT_MS,
          "App Store purchase",
        )
      : await withNativeTimeout(
          () =>
            purchases.purchaseStoreProduct({
              product: storeProduct!,
            }),
          NATIVE_PURCHASE_TIMEOUT_MS,
          "App Store purchase",
        );
    const refreshedCustomerInfo = await refreshCustomerInfoAfterPurchase(
      purchases,
      purchaseResult.customerInfo,
      reportStep,
    );
    return productPurchaseResultFromCustomerInfo(productId, refreshedCustomerInfo, "Purchase");
  } catch (error) {
    const firstErrorMessage = describePurchaseError(error);
    if (isTimeoutReason(firstErrorMessage)) {
      const reason = purchaseSetupHint(firstErrorMessage);
      showPurchaseDebugAlert("Purchase timed out", reason);
      return { purchased: false, reason };
    }

    if (packageToPurchase && !storeProduct) {
      purchaseDebugLog("Resolving StoreKit product route after RevenueCat package error.", {
        productId,
        error: firstErrorMessage,
      });
      storeProduct = await findStoreProduct(productId, reportStep);
    }

    if (!storeProduct) {
      const reason = purchaseSetupHint(
        lastStoreProductLookupReason ||
          firstErrorMessage ||
          "App Store purchase could not be completed right now.",
      );
      console.log("Native App Store purchase could not be completed.", {
        productId,
        error,
        reason,
      });
      showPurchaseDebugAlert("Purchase failed", summarizeErrorForDebug(error) || reason);
      return { purchased: false, reason };
    }

    try {
      const fallbackStoreProduct = storeProduct;
      reportStep?.("Retrying purchase route...");
      purchaseDebugLog("Retrying purchase via StoreKit product.", {
        storeProduct: fallbackStoreProduct.identifier,
      });
      const { customerInfo } = await withNativeTimeout(
        () =>
          purchases.purchaseStoreProduct({
            product: fallbackStoreProduct,
          }),
        NATIVE_PURCHASE_TIMEOUT_MS,
        "App Store purchase retry",
      );
      const refreshedCustomerInfo = await refreshCustomerInfoAfterPurchase(
        purchases,
        customerInfo,
        reportStep,
      );
      return productPurchaseResultFromCustomerInfo(
        productId,
        refreshedCustomerInfo,
        "Purchase retry",
      );
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
      showPurchaseDebugAlert(
        "Purchase failed",
        `Initial error:\n${summarizeErrorForDebug(error)}\n\nRetry error:\n${summarizeErrorForDebug(
          fallbackError,
        )}`,
      );
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
  purchaseDebugLog("Starting coin pack purchase.", { productId });
  const product = getProductById(productId);
  if (!product || product.type !== "consumable" || !product.coins) {
    showPurchaseDebugAlert("Coin purchase setup error", "Invalid product configuration.");
    return { coins: 0, reason: "Invalid product configuration." };
  }
  if (!isNativePlatform()) {
    showPurchaseDebugAlert(
      "Coin purchase unavailable",
      "App Store purchases are only available in the iOS app.",
    );
    return { coins: 0, reason: "App Store purchases are only available in the iPhone app." };
  }
  purchaseDebugLog("Ensuring RevenueCat configuration for coin purchase.", { productId });
  const configuredForPurchases = await ensureConfigured(reportStep);
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) {
    const reason =
      lastConfigurationReason ||
      "RevenueCat is not configured in this build. Add VITE_REVENUECAT_IOS_API_KEY in Codemagic.";
    showPurchaseDebugAlert("RevenueCat not configured", reason);
    return {
      coins: 0,
      reason,
    };
  }
  purchaseDebugLog("RevenueCat configuration available for coin purchase.", { productId });
  const canMakePayments = await checkCanMakePayments(purchases, reportStep);
  if (canMakePayments === false) {
    const reason =
      "This device or sandbox account cannot make App Store purchases right now. Check Screen Time restrictions, App Store sandbox account, and Paid Apps Agreement status.";
    showPurchaseDebugAlert("Purchases unavailable", reason);
    return { coins: 0, reason };
  }

  purchaseDebugLog("Resolving RevenueCat coin package purchase route.", { productId });
  let packageToPurchase = await findPackage(productId, reportStep);
  let storeProduct: PurchasesStoreProduct | null = null;
  if (!packageToPurchase) {
    purchaseDebugLog(
      "RevenueCat coin package route unavailable; resolving StoreKit product route.",
      {
        productId,
        reason: lastPackageLookupReason,
      },
    );
    storeProduct = await findStoreProduct(productId, reportStep);
  }
  purchaseDebugLog("Resolved coin purchase routes.", {
    productId,
    storeProduct: storeProduct?.identifier ?? null,
    revenueCatPackage: packageToPurchase
      ? `${packageToPurchase.identifier} / ${packageToPurchase.product.identifier}`
      : null,
    lastStoreProductLookupReason,
    lastPackageLookupReason,
  });
  if (!storeProduct && !packageToPurchase) {
    const reason =
      lastStoreProductLookupReason ||
      lastPackageLookupReason ||
      `Product not found in RevenueCat offering '${getOfferingId()}'. Check product IDs and offering setup.`;
    showPurchaseDebugAlert("Coin product not available", reason);
    return {
      coins: 0,
      reason,
    };
  }
  try {
    reportStep?.("Waiting for App Store confirmation...");
    const primaryRoute = packageToPurchase ? "purchasePackage" : "purchaseStoreProduct";
    purchaseDebugLog("Calling App Store coin purchase route.", {
      route: primaryRoute,
      storeProduct: storeProduct?.identifier ?? null,
      revenueCatPackage: packageToPurchase?.identifier ?? null,
      packageProduct: packageToPurchase?.product.identifier ?? null,
    });
    if (packageToPurchase) {
      await withNativeTimeout(
        () => purchases.purchasePackage({ aPackage: packageToPurchase }),
        NATIVE_PURCHASE_TIMEOUT_MS,
        "App Store coin purchase",
      );
    } else {
      await withNativeTimeout(
        () => purchases.purchaseStoreProduct({ product: storeProduct! }),
        NATIVE_PURCHASE_TIMEOUT_MS,
        "App Store coin purchase",
      );
    }
    showPurchaseDebugAlert(
      "Coin purchase returned",
      `Product: ${productId}\nCoins: ${product.coins}`,
    );
    return { coins: product.coins };
  } catch (error) {
    const firstErrorMessage = describePurchaseError(error);
    if (isTimeoutReason(firstErrorMessage)) {
      const message = purchaseSetupHint(firstErrorMessage);
      showPurchaseDebugAlert("Coin purchase timed out", message);
      return { coins: 0, reason: message };
    }

    if (packageToPurchase && !storeProduct) {
      purchaseDebugLog("Resolving StoreKit coin product route after package purchase error.", {
        productId,
        error: firstErrorMessage,
      });
      storeProduct = await findStoreProduct(productId, reportStep);
    }

    if (storeProduct) {
      try {
        const fallbackStoreProduct = storeProduct;
        reportStep?.("Retrying purchase route...");
        purchaseDebugLog("Retrying coin purchase via StoreKit product.", {
          storeProduct: fallbackStoreProduct.identifier,
        });
        await withNativeTimeout(
          () => purchases.purchaseStoreProduct({ product: fallbackStoreProduct }),
          NATIVE_PURCHASE_TIMEOUT_MS,
          "App Store coin purchase retry",
        );
        showPurchaseDebugAlert(
          "Coin purchase retry returned",
          `Product: ${productId}\nCoins: ${product.coins}`,
        );
        return { coins: product.coins };
      } catch (fallbackError) {
        const message = purchaseSetupHint(
          describePurchaseError(fallbackError) ||
            describePurchaseError(error) ||
            "App Store purchase could not be completed right now.",
        );
        showPurchaseDebugAlert(
          "Coin purchase failed",
          `Initial error:\n${summarizeErrorForDebug(error)}\n\nRetry error:\n${summarizeErrorForDebug(
            fallbackError,
          )}`,
        );
        return { coins: 0, reason: message };
      }
    }
    const message = purchaseSetupHint(
      describePurchaseError(error) || "App Store purchase could not be completed right now.",
    );
    showPurchaseDebugAlert("Coin purchase failed", summarizeErrorForDebug(error) || message);
    return { coins: 0, reason: message };
  }
}

export async function restorePurchases(): Promise<ProductId[]> {
  const configuredForPurchases = await ensureConfigured();
  const purchases = getConfiguredPurchases();
  if (!configuredForPurchases || !purchases) {
    console.log("Purchase restore requested, but RevenueCat is not configured in this build.");
    return [];
  }
  const { customerInfo } = await withNativeTimeout(
    () => purchases.restorePurchases(),
    NATIVE_SETUP_TIMEOUT_MS,
    "RevenueCat restore purchases",
  );
  return hasProEntitlement(customerInfo) ? [PRODUCT_IDS.proLabPack] : [];
}
