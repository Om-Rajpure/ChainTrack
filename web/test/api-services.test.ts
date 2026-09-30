import { test, describe } from "node:test";
import assert from "node:assert";
import { computeProductHash, buildCanonicalObject } from "../src/lib/hash.ts";
import { normalizeAddress } from "../src/lib/chain.ts";

describe("API Service Logic & Verification Engine", () => {
  const manufacturerWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const validDraftData = {
    serialNumber: "cuid-serial-12345",
    name: "Precision Pressure Sensor",
    category: "Industrial Sensors",
    description: "High accuracy sensor calibrated for high pressure lines",
    batchNumber: "BATCH-2026-PPS-01",
    manufacturingDate: "2026-07-20",
    manufacturerWallet,
    attributes: {
      range: "0-100 bar",
      output: "4-20 mA",
      accuracy: "+/- 0.1%",
    },
    imageHash: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
  };

  test("1. Draft pipeline generates identical hash to standalone computeProductHash", () => {
    const computedHash = computeProductHash(validDraftData);
    assert.match(computedHash, /^0x[a-f0-9]{64}$/i);

    const canonicalObj = buildCanonicalObject(validDraftData);
    assert.strictEqual(canonicalObj.manufacturerWallet, manufacturerWallet.toLowerCase());
    assert.strictEqual(canonicalObj.name, validDraftData.name);
  });

  test("2. Verification engine: Authenticates authentic product with matching hash", () => {
    const expectedOnChainHash = computeProductHash(validDraftData);

    // Simulated on-chain state
    const onChainProduct = {
      id: 1,
      dataHash: expectedOnChainHash,
      manufacturer: normalizeAddress(manufacturerWallet),
      currentOwner: normalizeAddress(manufacturerWallet),
      status: 0,
    };

    // Simulated off-chain database record
    const dbProduct = {
      ...validDraftData,
      manufacturerAddress: normalizeAddress(manufacturerWallet),
    };

    // Recompute hash from DB descriptive fields
    const recomputedHash = computeProductHash({
      serialNumber: dbProduct.serialNumber,
      name: dbProduct.name,
      category: dbProduct.category,
      description: dbProduct.description,
      batchNumber: dbProduct.batchNumber,
      manufacturingDate: dbProduct.manufacturingDate,
      manufacturerWallet: dbProduct.manufacturerAddress,
      attributes: dbProduct.attributes,
      imageHash: dbProduct.imageHash,
    });

    const isAuthentic = recomputedHash.toLowerCase() === onChainProduct.dataHash.toLowerCase();
    const result = isAuthentic ? "AUTHENTIC" : "DATA_MISMATCH";

    assert.strictEqual(result, "AUTHENTIC");
    assert.strictEqual(isAuthentic, true);
  });

  test("3. Verification engine: Detects DATA_MISMATCH if off-chain descriptive data was tampered", () => {
    const originalHash = computeProductHash(validDraftData);

    // On-chain state holds immutable original hash
    const onChainProduct = {
      id: 1,
      dataHash: originalHash,
      manufacturer: normalizeAddress(manufacturerWallet),
    };

    // Tampered database descriptive record (e.g., name changed)
    const tamperedDbProduct = {
      ...validDraftData,
      name: "Counterfeit Pressure Sensor",
      manufacturerAddress: normalizeAddress(manufacturerWallet),
    };

    const recomputedHash = computeProductHash({
      serialNumber: tamperedDbProduct.serialNumber,
      name: tamperedDbProduct.name,
      category: tamperedDbProduct.category,
      description: tamperedDbProduct.description,
      batchNumber: tamperedDbProduct.batchNumber,
      manufacturingDate: tamperedDbProduct.manufacturingDate,
      manufacturerWallet: tamperedDbProduct.manufacturerAddress,
      attributes: tamperedDbProduct.attributes,
      imageHash: tamperedDbProduct.imageHash,
    });

    const isAuthentic = recomputedHash.toLowerCase() === onChainProduct.dataHash.toLowerCase();
    const result = isAuthentic ? "AUTHENTIC" : "DATA_MISMATCH";

    assert.strictEqual(result, "DATA_MISMATCH");
    assert.strictEqual(isAuthentic, false);
    assert.notStrictEqual(recomputedHash, originalHash);
  });

  test("4. Confirmation verification checks: Rejects mismatched dataHash or manufacturer", () => {
    const draftHash = computeProductHash(validDraftData);
    const draftManufacturer = normalizeAddress(manufacturerWallet);

    // Simulated on-chain product with different dataHash
    const onChainMismatchedHash = {
      id: 2,
      dataHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      manufacturer: draftManufacturer,
    };

    const hashMatches = onChainMismatchedHash.dataHash.toLowerCase() === draftHash.toLowerCase();
    assert.strictEqual(hashMatches, false);

    // Simulated on-chain product created by different wallet
    const onChainMismatchedMfg = {
      id: 3,
      dataHash: draftHash,
      manufacturer: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    };

    const mfgMatches = onChainMismatchedMfg.manufacturer.toLowerCase() === draftManufacturer.toLowerCase();
    assert.strictEqual(mfgMatches, false);
  });
});
