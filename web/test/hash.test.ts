import { test, describe } from "node:test";
import assert from "node:assert";
import { ethers } from "ethers";
import {
  computeProductHash,
  buildCanonicalJson,
  buildCanonicalObject,
  sortObjectKeys,
  formatDateOnly,
  type ProductHashInput,
} from "../src/lib/hash.ts";

describe("Canonical Product Hashing Utility", () => {
  const baseProduct: ProductHashInput = {
    serialNumber: "3f2b6c1e-8a55-4c19-9a42-0d7f9b1e6a10",
    name: "Smart Watch X1",
    category: "Electronics",
    description: "Water resistant smart watch with GPS",
    batchNumber: "B-2026-09",
    manufacturingDate: "2026-09-01",
    manufacturerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    attributes: {
      color: "Midnight Black",
      screenSize: "1.4 inch",
      connectivity: "Bluetooth 5.3",
    },
    imageHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  };

  test("1. Computes deterministic hash for identical input", () => {
    const hash1 = computeProductHash(baseProduct);
    const hash2 = computeProductHash({ ...baseProduct });
    assert.strictEqual(hash1, hash2);
    assert.match(hash1, /^0x[a-f0-9]{64}$/i);
  });

  test("2. Key order independence at top level", () => {
    const reordered: ProductHashInput = {
      imageHash: baseProduct.imageHash,
      category: baseProduct.category,
      name: baseProduct.name,
      manufacturerWallet: baseProduct.manufacturerWallet,
      manufacturingDate: baseProduct.manufacturingDate,
      batchNumber: baseProduct.batchNumber,
      description: baseProduct.description,
      attributes: baseProduct.attributes,
      serialNumber: baseProduct.serialNumber,
    };

    const hash1 = computeProductHash(baseProduct);
    const hash2 = computeProductHash(reordered);
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(buildCanonicalJson(baseProduct), buildCanonicalJson(reordered));
  });

  test("3. Nested attribute key order independence", () => {
    const productA: ProductHashInput = {
      ...baseProduct,
      attributes: {
        z_index: "99",
        a_index: "1",
        m_index: "50",
      },
    };

    const productB: ProductHashInput = {
      ...baseProduct,
      attributes: {
        a_index: "1",
        m_index: "50",
        z_index: "99",
      },
    };

    assert.strictEqual(computeProductHash(productA), computeProductHash(productB));
    assert.strictEqual(buildCanonicalJson(productA), buildCanonicalJson(productB));
  });

  test("4. Omission of optional empty description", () => {
    const withEmptyDesc: ProductHashInput = {
      ...baseProduct,
      description: "",
    };
    const withNullDesc: ProductHashInput = {
      ...baseProduct,
      description: null,
    };
    const withoutDesc: ProductHashInput = {
      serialNumber: baseProduct.serialNumber,
      name: baseProduct.name,
      category: baseProduct.category,
      batchNumber: baseProduct.batchNumber,
      manufacturingDate: baseProduct.manufacturingDate,
      manufacturerWallet: baseProduct.manufacturerWallet,
      attributes: baseProduct.attributes,
      imageHash: baseProduct.imageHash,
    };

    const json1 = buildCanonicalJson(withEmptyDesc);
    const json2 = buildCanonicalJson(withNullDesc);
    const json3 = buildCanonicalJson(withoutDesc);

    assert.strictEqual(json1, json2);
    assert.strictEqual(json2, json3);
    assert.ok(!json1.includes('"description"'));
  });

  test("5. Omission of optional empty attributes", () => {
    const withEmptyAttrs: ProductHashInput = {
      ...baseProduct,
      attributes: {},
    };
    const withNullAttrs: ProductHashInput = {
      ...baseProduct,
      attributes: null,
    };
    const withoutAttrs: ProductHashInput = {
      serialNumber: baseProduct.serialNumber,
      name: baseProduct.name,
      category: baseProduct.category,
      batchNumber: baseProduct.batchNumber,
      manufacturingDate: baseProduct.manufacturingDate,
      manufacturerWallet: baseProduct.manufacturerWallet,
      description: baseProduct.description,
      imageHash: baseProduct.imageHash,
    };

    const json1 = buildCanonicalJson(withEmptyAttrs);
    const json2 = buildCanonicalJson(withNullAttrs);
    const json3 = buildCanonicalJson(withoutAttrs);

    assert.strictEqual(json1, json2);
    assert.strictEqual(json2, json3);
    assert.ok(!json1.includes('"attributes"'));
  });

  test("6. Omission of optional empty imageHash", () => {
    const withEmptyImg: ProductHashInput = {
      ...baseProduct,
      imageHash: "",
    };
    const withNullImg: ProductHashInput = {
      ...baseProduct,
      imageHash: null,
    };

    const json1 = buildCanonicalJson(withEmptyImg);
    const json2 = buildCanonicalJson(withNullImg);

    assert.strictEqual(json1, json2);
    assert.ok(!json1.includes('"imageHash"'));
  });

  test("7. Normalizes Date object and date string to YYYY-MM-DD", () => {
    const withDateObj: ProductHashInput = {
      ...baseProduct,
      manufacturingDate: new Date("2026-09-01T12:00:00.000Z"),
    };
    const withDateStr: ProductHashInput = {
      ...baseProduct,
      manufacturingDate: "2026-09-01",
    };

    assert.strictEqual(formatDateOnly(withDateObj.manufacturingDate), "2026-09-01");
    assert.strictEqual(formatDateOnly(withDateStr.manufacturingDate), "2026-09-01");
    assert.strictEqual(computeProductHash(withDateObj), computeProductHash(withDateStr));
  });

  test("8. Normalizes manufacturerWallet to lowercase", () => {
    const upperWallet: ProductHashInput = {
      ...baseProduct,
      manufacturerWallet: "0x70997970C51812DC3A010C7D01B50E0D17DC79C8",
    };
    const lowerWallet: ProductHashInput = {
      ...baseProduct,
      manufacturerWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    };

    assert.strictEqual(computeProductHash(upperWallet), computeProductHash(lowerWallet));
  });

  test("9. Changing any core metadata field changes hash", () => {
    const baseHash = computeProductHash(baseProduct);

    const changedName = computeProductHash({ ...baseProduct, name: "Smart Watch X2" });
    const changedCategory = computeProductHash({ ...baseProduct, category: "Wearables" });
    const changedBatch = computeProductHash({ ...baseProduct, batchNumber: "B-2026-10" });
    const changedSerial = computeProductHash({ ...baseProduct, serialNumber: "different-serial" });
    const changedDate = computeProductHash({ ...baseProduct, manufacturingDate: "2026-09-02" });
    const changedWallet = computeProductHash({
      ...baseProduct,
      manufacturerWallet: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    });
    const changedAttr = computeProductHash({
      ...baseProduct,
      attributes: { color: "Silver" },
    });
    const changedImage = computeProductHash({
      ...baseProduct,
      imageHash: "0x9999999990abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    });

    assert.notStrictEqual(changedName, baseHash);
    assert.notStrictEqual(changedCategory, baseHash);
    assert.notStrictEqual(changedBatch, baseHash);
    assert.notStrictEqual(changedSerial, baseHash);
    assert.notStrictEqual(changedDate, baseHash);
    assert.notStrictEqual(changedWallet, baseHash);
    assert.notStrictEqual(changedAttr, baseHash);
    assert.notStrictEqual(changedImage, baseHash);
  });

  test("10. Canonical string matches authoritative documentation reference example", () => {
    const docExample: ProductHashInput = {
      batchNumber: "B-2026-09",
      category: "Electronics",
      manufacturerWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      manufacturingDate: "2026-09-01",
      name: "Smart Watch X1",
      serialNumber: "3f2b6c1e-8a55-4c19-9a42-0d7f9b1e6a10",
    };

    const expectedCanonicalJson =
      '{"batchNumber":"B-2026-09","category":"Electronics","manufacturerWallet":"0x70997970c51812dc3a010c7d01b50e0d17dc79c8","manufacturingDate":"2026-09-01","name":"Smart Watch X1","serialNumber":"3f2b6c1e-8a55-4c19-9a42-0d7f9b1e6a10"}';

    const actualJson = buildCanonicalJson(docExample);
    assert.strictEqual(actualJson, expectedCanonicalJson);

    const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(expectedCanonicalJson));
    assert.strictEqual(computeProductHash(docExample), expectedHash);
  });
});
