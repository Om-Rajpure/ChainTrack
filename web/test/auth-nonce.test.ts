import { test, describe } from "node:test";
import assert from "node:assert";
import { generateNonce, NONCE_EXPIRATION_MINUTES } from "../src/lib/auth-nonce.ts";
import { normalizeAddress } from "../src/lib/chain.ts";

describe("Auth Nonce Service & Lifecycle", () => {
  const testAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const normalizedTestAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

  test("1. generateNonce returns high-entropy 64-character hex string", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();

    assert.strictEqual(typeof nonce1, "string");
    assert.strictEqual(nonce1.length, 64);
    assert.match(nonce1, /^[a-f0-9]{64}$/);
    assert.notStrictEqual(nonce1, nonce2);
  });

  test("2. normalizeAddress handles checksummed and lowercase addresses consistently", () => {
    assert.strictEqual(normalizeAddress(testAddress), normalizedTestAddress);
    assert.strictEqual(normalizeAddress(normalizedTestAddress), normalizedTestAddress);
    assert.throws(() => normalizeAddress("invalid-address"));
  });

  test("3. Nonce expiration window is configured for 5 minutes", () => {
    assert.strictEqual(NONCE_EXPIRATION_MINUTES, 5);
  });
});
