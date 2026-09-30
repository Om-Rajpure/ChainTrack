import { test, describe } from "node:test";
import assert from "node:assert";
import {
  createProductDraftSchema,
  confirmProductSchema,
  createParticipantProfileSchema,
  patchParticipantProfileSchema,
  authNonceQuerySchema,
  authVerifySchema,
  productQuerySchema,
  byteLength,
} from "../src/lib/validation.ts";

describe("Zod Validation Schemas", () => {
  const validDraftInput = {
    name: "Organic Coffee Beans 500g",
    category: "Beverages",
    description: "Single origin Arabica coffee beans from sustainable farms.",
    batchNumber: "LOT-2026-COF-01",
    manufacturingDate: "2026-08-15",
    manufacturerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    attributes: {
      roastLevel: "Medium Dark",
      altitude: "1800m",
      process: "Washed",
    },
    imageUrl: "https://example.com/uploads/coffee-beans.jpg",
    imageHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  };

  test("1. Valid product draft payload passes validation and normalizes wallet to lowercase", () => {
    const parsed = createProductDraftSchema.parse(validDraftInput);
    assert.strictEqual(parsed.name, "Organic Coffee Beans 500g");
    assert.strictEqual(parsed.manufacturerWallet, "0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
  });

  test("2. Empty or oversized name is rejected", () => {
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, name: "" }));
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, name: "a".repeat(101) }));
  });

  test("3. Empty or oversized category is rejected", () => {
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, category: "" }));
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, category: "c".repeat(51) }));
  });

  test("4. Oversized description (>1000 chars) is rejected", () => {
    assert.throws(() =>
      createProductDraftSchema.parse({ ...validDraftInput, description: "d".repeat(1001) })
    );
  });

  test("5. Empty or oversized batchNumber is rejected", () => {
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, batchNumber: "" }));
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, batchNumber: "b".repeat(51) }));
  });

  test("6. Future manufacturing date is rejected", () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    assert.throws(() =>
      createProductDraftSchema.parse({ ...validDraftInput, manufacturingDate: futureDate })
    );
  });

  test("7. Invalid Ethereum address format is rejected", () => {
    assert.throws(() =>
      createProductDraftSchema.parse({ ...validDraftInput, manufacturerWallet: "not-an-address" })
    );
    assert.throws(() =>
      createProductDraftSchema.parse({ ...validDraftInput, manufacturerWallet: "0x12345" })
    );
  });

  test("8. Attributes constraints (max 20 keys, key max 40 chars, val max 200 chars)", () => {
    // > 20 keys
    const tooManyKeys: Record<string, string> = {};
    for (let i = 0; i < 21; i++) tooManyKeys[`key_${i}`] = `value_${i}`;
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, attributes: tooManyKeys }));

    // Key > 40 chars
    const longKey = { ["k".repeat(41)]: "valid value" };
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, attributes: longKey }));

    // Value > 200 chars
    const longVal = { validKey: "v".repeat(201) };
    assert.throws(() => createProductDraftSchema.parse({ ...validDraftInput, attributes: longVal }));
  });

  test("9. UTF-8 byte length limits for location (100 bytes) and note (280 bytes)", () => {
    const locationSchema = byteLength(100, 1);
    const noteSchema = byteLength(280, 0);

    // Exact 100 bytes ASCII -> pass
    assert.doesNotThrow(() => locationSchema.parse("L".repeat(100)));
    // 101 bytes ASCII -> fail
    assert.throws(() => locationSchema.parse("L".repeat(101)));

    // Multi-byte characters: each '€' is 3 bytes in UTF-8
    // 33 * 3 = 99 bytes -> pass
    assert.doesNotThrow(() => locationSchema.parse("€".repeat(33)));
    // 34 * 3 = 102 bytes -> fail
    assert.throws(() => locationSchema.parse("€".repeat(34)));

    // Exact 280 bytes note -> pass
    assert.doesNotThrow(() => noteSchema.parse("N".repeat(280)));
    // 281 bytes note -> fail
    assert.throws(() => noteSchema.parse("N".repeat(281)));
  });

  test("10. Product confirmation schema validation", () => {
    const validConfirm = {
      draftId: "cuid-draft-123",
      productId: 1,
      txHash: "0x" + "a".repeat(64),
    };
    assert.doesNotThrow(() => confirmProductSchema.parse(validConfirm));

    // Invalid txHash
    assert.throws(() => confirmProductSchema.parse({ ...validConfirm, txHash: "0x123" }));
    // Invalid productId (zero or negative)
    assert.throws(() => confirmProductSchema.parse({ ...validConfirm, productId: 0 }));
    assert.throws(() => confirmProductSchema.parse({ ...validConfirm, productId: -5 }));
  });

  test("11. Participant profile schema validation", () => {
    const validParticipant = {
      walletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      role: "MANUFACTURER",
      organizationName: "Acme Manufacturing Ltd.",
      contactEmail: "contact@acme.example.com",
      location: "Industrial District 5, Berlin",
    };
    assert.doesNotThrow(() => createParticipantProfileSchema.parse(validParticipant));

    // Invalid email
    assert.throws(() =>
      createParticipantProfileSchema.parse({ ...validParticipant, contactEmail: "invalid-email" })
    );

    // Invalid role
    assert.throws(() =>
      createParticipantProfileSchema.parse({ ...validParticipant, role: "ADMIN" })
    );
  });

  test("12. Auth Nonce query and Auth Verify schema validation", () => {
    const validAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    assert.doesNotThrow(() => authNonceQuerySchema.parse({ address: validAddress }));
    assert.throws(() => authNonceQuerySchema.parse({ address: "invalid" }));

    const validVerify = {
      address: validAddress,
      signature: "0x" + "b".repeat(130),
      nonce: "random-nonce-string-12345",
    };
    assert.doesNotThrow(() => authVerifySchema.parse(validVerify));
    assert.throws(() => authVerifySchema.parse({ ...validVerify, signature: "invalid-sig" }));
  });
});
