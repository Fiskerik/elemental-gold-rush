import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_ROOT = "https://api.appstoreconnect.apple.com/v1";
const PROMOTIONAL_TEXT_LIMIT = 170;
const WHATS_NEW_LIMIT = 4000;
const DESCRIPTION_LIMIT = 4000;
const KEYWORDS_LIMIT = 100;

const CONFIG_PATH = path.join(ROOT, "localization", "app-store", "appstore.config.json");
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const sourceMetadata = JSON.parse(
  readFileSync(path.resolve(ROOT, config.sourceMetadataPath), "utf8"),
);

const args = process.argv.slice(2);
const command = args[0] ?? "validate";
const options = parseOptions(args.slice(1));

if (!["validate", "upload"].includes(command)) {
  fail(`Unknown command "${command}". Use "validate" or "upload".`);
}

const version = options.version;
if (!version) {
  fail("Missing --version. Example: npm run appstore:validate -- --version 1.1.2");
}

const notesPath = path.resolve(
  ROOT,
  options.file ?? config.releaseNotesPath.replace("{version}", version),
);
const notes = await parseReleaseNotes(notesPath);
const validation = validateNotes(notes, sourceMetadata);

if (!validation.ok) {
  for (const error of validation.errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else if (command === "validate") {
  printValidation(notes, notesPath);
} else if (options.dryRun) {
  printValidation(notes, notesPath);
  console.log(`DRY RUN: would upload ${notes.locales.size} locale(s) for iOS ${version}.`);
} else {
  await uploadMetadata(notes, version);
}

function parseOptions(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) fail(`Unexpected argument "${value}".`);
    const name = value.slice(2);
    if (name === "dry-run") {
      parsed.dryRun = true;
      continue;
    }
    const next = values[index + 1];
    if (!next || next.startsWith("--")) fail(`Missing value for --${name}.`);
    parsed[name] = next;
    index += 1;
  }
  return parsed;
}

async function parseReleaseNotes(filePath) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    fail(`Release-notes file not found: ${path.relative(ROOT, filePath)}`);
  }

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const locales = new Map();
  const order = [];
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^## .* \u2014 ([A-Za-z0-9-]+)$/);
    if (heading) {
      const locale = heading[1];
      current = { locale, promotionalText: "", whatsNew: "" };
      locales.set(locale, current);
      order.push(locale);
      continue;
    }
    if (!current) continue;

    if (lines[index] === "Promotional Text:") {
      current.promotionalText = (lines[index + 1] ?? "").trim();
      index += 1;
      continue;
    }
    if (lines[index] === "What's New:") {
      const content = [];
      let next = index + 1;
      while (next < lines.length && !lines[next].startsWith("## ")) {
        content.push(lines[next]);
        next += 1;
      }
      current.whatsNew = content.join("\n").trim();
      index = next - 1;
    }
  }

  return { locales, order };
}

function validateNotes(notes, metadata) {
  const errors = [];
  const expectedLocales = Object.keys(metadata.locales ?? {});
  const expectedSet = new Set(expectedLocales);
  const actualLocales = [...notes.locales.keys()];
  const actualSet = new Set(actualLocales);

  for (const locale of expectedLocales) {
    if (!actualSet.has(locale)) errors.push(`Missing locale section: ${locale}`);
  }
  for (const locale of actualLocales) {
    if (!expectedSet.has(locale)) errors.push(`Unexpected locale section: ${locale}`);
  }
  if (actualLocales.length !== actualSet.size) errors.push("Duplicate locale sections found.");

  const configuredOrder = config.releaseNotesLocaleOrder ?? [];
  const expectedOrder = configuredOrder.length
    ? configuredOrder
    : expectedLocales
        .slice()
        .sort((a, b) => displayName(metadata, a).localeCompare(displayName(metadata, b)));
  if (configuredOrder.some((locale) => !expectedSet.has(locale))) {
    errors.push("appstore.config.json contains a release-notes locale that is missing from packages.json.");
  }
  if (expectedOrder.length !== expectedLocales.length) {
    errors.push("appstore.config.json releaseNotesLocaleOrder must include every packages.json locale exactly once.");
  }
  if (actualLocales.join("\n") !== expectedOrder.join("\n")) {
    errors.push(
      `Locale sections must be alphabetical by display name: ${expectedOrder.join(", ")}`,
    );
  }

  for (const [locale, entry] of notes.locales) {
    const localeMetadata = metadataForLocale(metadata, locale);
    const description = normalizeMetadataText(localeMetadata?.description);
    const keywords = normalizeMetadataText(localeMetadata?.keywords);
    const promotionalLength = characterCount(entry.promotionalText);
    const whatsNewLength = characterCount(entry.whatsNew);
    if (!entry.promotionalText || entry.promotionalText.startsWith("<")) {
      errors.push(`${locale}: Promotional Text is empty or still a placeholder.`);
    }
    if (!entry.whatsNew || entry.whatsNew.startsWith("<")) {
      errors.push(`${locale}: What's New is empty or still a placeholder.`);
    }
    if (promotionalLength > PROMOTIONAL_TEXT_LIMIT) {
      errors.push(`${locale}: Promotional Text is ${promotionalLength}/${PROMOTIONAL_TEXT_LIMIT} characters.`);
    }
    if (whatsNewLength > WHATS_NEW_LIMIT) {
      errors.push(`${locale}: What's New is ${whatsNewLength}/${WHATS_NEW_LIMIT} characters.`);
    }
    if (!description || description.startsWith("<")) {
      errors.push(`${locale}: Description is empty or still a placeholder.`);
    } else if (characterCount(description) > DESCRIPTION_LIMIT) {
      errors.push(`${locale}: Description is ${characterCount(description)}/${DESCRIPTION_LIMIT} characters.`);
    }
    if (!keywords || keywords.startsWith("<")) {
      errors.push(`${locale}: Keywords are empty or still a placeholder.`);
    } else if (characterCount(keywords) > KEYWORDS_LIMIT) {
      errors.push(`${locale}: Keywords are ${characterCount(keywords)}/${KEYWORDS_LIMIT} characters.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function printValidation(notes, filePath) {
  console.log(`Valid release notes: ${path.relative(ROOT, filePath)}`);
  console.log(`Locales: ${notes.locales.size}`);
  for (const entry of notes.locales.values()) {
    const metadata = metadataForLocale(sourceMetadata, entry.locale);
    const description = normalizeMetadataText(metadata?.description);
    const keywords = normalizeMetadataText(metadata?.keywords);
    console.log(
      `  ${entry.locale}: Description ${characterCount(description)}/${DESCRIPTION_LIMIT}, Keywords ${characterCount(keywords)}/${KEYWORDS_LIMIT}, Promotional Text ${characterCount(entry.promotionalText)}/${PROMOTIONAL_TEXT_LIMIT}, What's New ${characterCount(entry.whatsNew)}/${WHATS_NEW_LIMIT}`,
    );
  }
}

function metadataForLocale(metadata, locale) {
  return metadata.locales?.[locale] ?? null;
}

function normalizeMetadataText(value) {
  return String(value ?? "").replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
}

async function uploadMetadata(notes, version) {
  const token = createAppStoreConnectToken();
  const appId = await resolveAppId(token);
  const versionResource = await resolveVersion(token, appId, version);
  const versionId = versionResource.id;
  const versionLocalizations = await apiRequest(
    token,
    `/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=200`,
  );
  const existingVersionLocalizations = new Map(
    versionLocalizations.data.map((item) => [item.attributes.locale, item]),
  );

  const appInfo = await resolveAppInfo(token, appId, versionResource);
  const appInfoLocalizations = await apiRequest(
    token,
    `/appInfos/${appInfo.id}/appInfoLocalizations?limit=200`,
  );
  const existingAppInfoLocalizations = new Map(
    appInfoLocalizations.data.map((item) => [item.attributes.locale, item]),
  );

  let createdAppInfo = 0;
  let updatedAppInfo = 0;
  let createdVersion = 0;
  let updatedVersion = 0;
  let unchangedVersion = 0;

  for (const [locale, entry] of notes.locales) {
    const appLocale = sourceMetadata.locales[locale];
    const existingAppInfo = existingAppInfoLocalizations.get(locale);
    if (!existingAppInfo) {
      await apiRequest(token, "/appInfoLocalizations", {
        method: "POST",
        body: {
          data: {
            type: "appInfoLocalizations",
            attributes: {
              locale,
              name: appLocale.appName,
              subtitle: appLocale.subtitle,
              privacyPolicyUrl: config.privacyPolicyUrl,
            },
            relationships: {
              appInfo: { data: { type: "appInfos", id: appInfo.id } },
            },
          },
        },
      });
      createdAppInfo += 1;
    } else {
      const attributes = {};
      if (existingAppInfo.attributes.name !== appLocale.appName) attributes.name = appLocale.appName;
      if (existingAppInfo.attributes.subtitle !== appLocale.subtitle) attributes.subtitle = appLocale.subtitle;
      if (Object.keys(attributes).length > 0) {
        await apiRequest(token, `/appInfoLocalizations/${existingAppInfo.id}`, {
          method: "PATCH",
          body: { data: { type: "appInfoLocalizations", id: existingAppInfo.id, attributes } },
        });
        updatedAppInfo += 1;
      }
    }

    const existing = existingVersionLocalizations.get(locale);
    if (!existing) {
      await apiRequest(token, "/appStoreVersionLocalizations", {
        method: "POST",
        body: {
          data: {
            type: "appStoreVersionLocalizations",
            attributes: {
              locale,
              description: normalizeMetadataText(appLocale.description),
              keywords: normalizeMetadataText(appLocale.keywords),
              promotionalText: entry.promotionalText,
              whatsNew: entry.whatsNew,
            },
            relationships: {
              appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
            },
          },
        },
      });
      createdVersion += 1;
      continue;
    }

    const attributes = {};
    const description = normalizeMetadataText(appLocale.description);
    const keywords = normalizeMetadataText(appLocale.keywords);
    if (existing.attributes.description !== description) {
      attributes.description = description;
    }
    if (existing.attributes.keywords !== keywords) {
      attributes.keywords = keywords;
    }
    if (existing.attributes.promotionalText !== entry.promotionalText) {
      attributes.promotionalText = entry.promotionalText;
    }
    if (existing.attributes.whatsNew !== entry.whatsNew) {
      attributes.whatsNew = entry.whatsNew;
    }
    if (Object.keys(attributes).length === 0) {
      unchangedVersion += 1;
      continue;
    }
    await apiRequest(token, `/appStoreVersionLocalizations/${existing.id}`, {
      method: "PATCH",
      body: {
        data: {
          type: "appStoreVersionLocalizations",
          id: existing.id,
          attributes,
        },
      },
    });
    updatedVersion += 1;
  }

  console.log(`Uploaded metadata for iOS ${version}.`);
  console.log(`App-info localizations created: ${createdAppInfo}`);
  console.log(`App-info localizations updated: ${updatedAppInfo}`);
  console.log(`Version localizations created: ${createdVersion}`);
  console.log(`Version localizations updated: ${updatedVersion}`);
  console.log(`Version localizations unchanged: ${unchangedVersion}`);
}

function createAppStoreConnectToken() {
  const issuerId = process.env.ASC_ISSUER_ID;
  const keyId = process.env.ASC_KEY_ID;
  const privateKeyPath = process.env.ASC_PRIVATE_KEY_PATH;
  const privateKey = process.env.ASC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!issuerId || !keyId || (!privateKey && !privateKeyPath)) {
    fail(
      "Upload authentication requires ASC_ISSUER_ID, ASC_KEY_ID, and either ASC_PRIVATE_KEY or ASC_PRIVATE_KEY_PATH.",
    );
  }

  const key = privateKey ?? readFileSync(path.resolve(privateKeyPath), "utf8");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url({ alg: "ES256", kid: keyId, typ: "JWT" });
  const payload = base64Url({ iss: issuerId, iat: now, exp: now + 900, aud: "appstoreconnect-v1" });
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

async function resolveAppId(token) {
  if (process.env.ASC_APP_ID) return process.env.ASC_APP_ID;
  const bundleId = process.env.ASC_BUNDLE_ID ?? config.bundleId;
  const response = await apiRequest(
    token,
    `/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=10`,
  );
  if (response.data.length !== 1) {
    fail(`Expected exactly one App Store Connect app for bundle ID ${bundleId}.`);
  }
  return response.data[0].id;
}

async function resolveVersion(token, appId, version) {
  const response = await apiRequest(token, `/apps/${appId}/appStoreVersions?limit=200`);
  const matches = response.data.filter(
    (item) => item.attributes.versionString === version && item.attributes.platform === config.platform,
  );
  if (matches.length !== 1) {
    fail(
      `Expected exactly one ${config.platform} App Store version ${version}; found ${matches.length}. Upload the build first if this is a new version.`,
    );
  }
  return matches[0];
}

async function resolveAppInfo(token, appId, versionResource) {
  if (process.env.ASC_APP_INFO_ID) {
    return { id: process.env.ASC_APP_INFO_ID };
  }

  const response = await apiRequest(token, `/apps/${appId}/appInfos?limit=200`);
  const matches = response.data.filter((item) => item.attributes?.appStoreState);
  if (matches.length === 1) return matches[0];

  // Apple keeps one App Info record for the live version and another for the
  // version currently being prepared. For a new release, prefer the non-live
  // record; for a live-version update, prefer the Ready for Sale record.
  const versionState = versionResource.attributes?.appStoreState;
  const preferred =
    versionState === "READY_FOR_SALE"
      ? matches.filter((item) => item.attributes.appStoreState === "READY_FOR_SALE")
      : matches.filter((item) => item.attributes.appStoreState !== "READY_FOR_SALE");
  if (preferred.length === 1) return preferred[0];

  const exactState = matches.filter(
    (item) => item.attributes.appStoreState === versionState,
  );
  if (exactState.length === 1) return exactState[0];

  const states = matches
    .map((item) => `${item.id}:${item.attributes.appStoreState}`)
    .join(", ");
  fail(
    `Could not uniquely select the App Info record for iOS ${versionResource.attributes?.versionString ?? "the requested version"}. Found ${matches.length}: ${states}. Set ASC_APP_INFO_ID to override.`,
  );
}

async function apiRequest(token, endpoint, { method = "GET", body } = {}) {
  const response = await fetch(`${API_ROOT}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const detail = payload?.errors?.map((error) => error.detail).filter(Boolean).join("; ");
    fail(`App Store Connect API ${response.status}: ${detail || text || response.statusText}`);
  }
  return payload;
}

function displayName(metadata, locale) {
  return metadata.locales?.[locale]?.displayName ?? locale;
}

function characterCount(value) {
  return Array.from(value).length;
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
