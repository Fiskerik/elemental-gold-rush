import assert from "node:assert/strict";
import test from "node:test";
import { compareVersions, shouldOfferAppUpdate } from "../src/game/appUpdateVersion.ts";

test("does not offer the installed App Store version again", () => {
  assert.equal(shouldOfferAppUpdate("1.1.4", "1.1.4"), false);
  assert.equal(shouldOfferAppUpdate("1.1.4.0", "1.1.4"), false);
});

test("offers a genuinely newer App Store version", () => {
  assert.equal(shouldOfferAppUpdate("1.1.5", "1.1.4"), true);
  assert.ok(compareVersions("1.2.0", "1.10.0") < 0);
});

test("keeps a dismissed version hidden until a later release", () => {
  assert.equal(shouldOfferAppUpdate("1.1.5", "1.1.4", "1.1.5"), false);
  assert.equal(shouldOfferAppUpdate("1.1.6", "1.1.4", "1.1.5"), true);
});

test("fails open when the bundled version is unavailable", () => {
  assert.equal(shouldOfferAppUpdate("1.1.5", ""), false);
});
