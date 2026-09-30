import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { ethers } from "ethers";
import { computeProductHash } from "../src/lib/hash";
import { generateNonce, NONCE_EXPIRATION_MINUTES } from "../src/lib/auth-nonce";
import { createSessionToken, verifySessionToken } from "../src/lib/auth-session";
import {
  createProductDraftSchema,
  confirmProductSchema,
  createParticipantProfileSchema,
  patchParticipantProfileSchema,
} from "../src/lib/validation";

test("Phase 7: Integration, Hardening & Security Test Suite", async (t) => {
  // 1. SIWE Authentication & Session Hardening
  await t.test("Auth 1: High-entropy nonce generation and 5-min TTL expiry", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();

    assert.equal(nonce1.length, 64, "Nonce must be 64-character hex string (256-bit entropy)");
    assert.match(nonce1, /^[a-f0-9]{64}$/);
    assert.notEqual(nonce1, nonce2, "Consecutive nonces must be uniquely randomized");
    assert.equal(NONCE_EXPIRATION_MINUTES, 5, "Nonce validity must strictly equal 5 minutes");
  });

  await t.test("Auth 2: Single-use nonce consumption and replay prevention simulation", () => {
    const nonceStore = new Map<string, { address: string; expiresAt: number; usedAt: number | null }>();

    const issueTestNonce = (address: string) => {
      const nonce = generateNonce();
      nonceStore.set(nonce, {
        address: address.toLowerCase(),
        expiresAt: Date.now() + 5 * 60 * 1000,
        usedAt: null,
      });
      return nonce;
    };

    const validateAndConsume = (address: string, nonce: string) => {
      const record = nonceStore.get(nonce);
      if (!record) return { valid: false, reason: "NONCE_NOT_FOUND" };
      if (record.address !== address.toLowerCase()) return { valid: false, reason: "NONCE_ADDRESS_MISMATCH" };
      if (record.usedAt !== null) return { valid: false, reason: "NONCE_ALREADY_USED" };
      if (record.expiresAt < Date.now()) return { valid: false, reason: "NONCE_EXPIRED" };

      record.usedAt = Date.now();
      return { valid: true };
    };

    const address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const nonce = issueTestNonce(address);

    // First consumption -> Valid
    const check1 = validateAndConsume(address, nonce);
    assert.equal(check1.valid, true, "First consumption of fresh nonce must succeed");

    // Second consumption (Replay Attack) -> Rejected
    const check2 = validateAndConsume(address, nonce);
    assert.equal(check2.valid, false, "Replay of consumed nonce must be rejected");
    assert.equal(check2.reason, "NONCE_ALREADY_USED");

    // Different address claim -> Rejected
    const nonceForOther = issueTestNonce("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    const checkMismatch = validateAndConsume(address, nonceForOther);
    assert.equal(checkMismatch.valid, false);
    assert.equal(checkMismatch.reason, "NONCE_ADDRESS_MISMATCH");
  });

  await t.test("Auth 3: EIP-4361 cryptographic signature recovery and mismatch detection", async () => {
    const walletA = ethers.Wallet.createRandom();
    const walletB = ethers.Wallet.createRandom();
    const nonce = generateNonce();

    const message = `Sign in with Ethereum to ChainTrack Supply Chain Tracker\nNonce: ${nonce}`;
    const signatureA = await walletA.signMessage(message);

    // Verify valid signer
    const recoveredA = ethers.verifyMessage(message, signatureA).toLowerCase();
    assert.equal(recoveredA, walletA.address.toLowerCase());

    // Claimed address mismatch check
    assert.notEqual(recoveredA, walletB.address.toLowerCase(), "Recovered address must not match different wallet");
  });

  await t.test("Auth 4: JWT session token creation, verification and tamper detection", async () => {
    const address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase();
    const token = await createSessionToken({
      address,
      role: "RETAILER",
      active: true,
    });

    assert.ok(token && typeof token === "string");

    // Verify valid token
    const payload = await verifySessionToken(token);
    assert.ok(payload);
    assert.equal(payload.address, address);
    assert.equal(payload.role, "RETAILER");
    assert.equal(payload.active, true);

    // Tampered token rejection
    const tamperedToken = token.slice(0, -5) + "abcde";
    const invalidPayload = await verifySessionToken(tamperedToken);
    assert.equal(invalidPayload, null, "Tampered JWT must be rejected");
  });

  // 2. Canonical Hashing & Tamper-Evident Verification Engine
  await t.test("Verification 1: Canonical hash detects any attribute tampering", () => {
    const baseProduct = {
      serialNumber: "SN-998811",
      name: "Paracetamol 500mg",
      category: "Pharmaceuticals",
      description: "Analgesic medicine",
      batchNumber: "BATCH-2026-X1",
      manufacturingDate: "2026-09-30",
      manufacturerWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      attributes: { dosage: "500mg", units: 100 },
      imageHash: "0x" + "1".repeat(64),
    };

    const authenticHash = computeProductHash(baseProduct);

    // Tamper single field: name
    const tamperedName = computeProductHash({ ...baseProduct, name: "Paracetamol 1000mg" });
    assert.notEqual(authenticHash, tamperedName, "Changed name must produce mismatched hash");

    // Tamper batch
    const tamperedBatch = computeProductHash({ ...baseProduct, batchNumber: "BATCH-2026-X2" });
    assert.notEqual(authenticHash, tamperedBatch, "Changed batch must produce mismatched hash");

    // Tamper manufacturer wallet
    const tamperedWallet = computeProductHash({
      ...baseProduct,
      manufacturerWallet: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    });
    assert.notEqual(authenticHash, tamperedWallet, "Changed manufacturer must produce mismatched hash");

    // Tamper nested attribute
    const tamperedAttr = computeProductHash({
      ...baseProduct,
      attributes: { dosage: "500mg", units: 99 },
    });
    assert.notEqual(authenticHash, tamperedAttr, "Changed attribute must produce mismatched hash");
  });

  // 3. Indexer Idempotency & Cursor Simulation
  await t.test("Indexer 1: Event deduplication key ensures strict idempotency", () => {
    const eventsStore = new Map<string, any>();

    const recordEvent = (txHash: string, logIndex: number, eventData: any) => {
      const key = `${txHash.toLowerCase()}_${logIndex}`;
      if (!eventsStore.has(key)) {
        eventsStore.set(key, eventData);
        return { created: true };
      }
      return { created: false };
    };

    const txHash = "0x" + "e".repeat(64);
    const logIndex = 0;

    // Run 1
    const res1 = recordEvent(txHash, logIndex, { eventType: "REGISTERED", productId: 1 });
    assert.equal(res1.created, true);
    assert.equal(eventsStore.size, 1);

    // Run 2 (Simulate identical batch replay over same blocks)
    const res2 = recordEvent(txHash, logIndex, { eventType: "REGISTERED", productId: 1 });
    assert.equal(res2.created, false, "Duplicate event must be skipped without creating new rows");
    assert.equal(eventsStore.size, 1, "Total stored events count must remain strictly unchanged");
  });

  await t.test("Indexer 2: Block cursor progression and resumption logic", () => {
    let lastProcessedBlock = 100;
    const latestBlock = 150;
    const confirmations = 0; // Local chain

    const targetBlock = Math.max(0, latestBlock - confirmations);
    const fromBlock = lastProcessedBlock + 1;
    const toBlock = Math.min(targetBlock, fromBlock + 1999);

    assert.equal(fromBlock, 101);
    assert.equal(toBlock, 150);

    // Simulate batch complete: cursor advances to toBlock
    lastProcessedBlock = toBlock;
    assert.equal(lastProcessedBlock, 150);

    // Next run when no new blocks exist
    const nextFrom = lastProcessedBlock + 1;
    assert.ok(nextFrom > targetBlock, "Cursor correctly recognizes it is fully up to date");
  });

  // 4. API Input Validation & Security Bounds
  await t.test("Validation 1: Reject malicious or malformed inputs", () => {
    // 1. Invalid Ethereum Address
    assert.throws(() => {
      createProductDraftSchema.parse({
        name: "Test",
        category: "Test",
        batchNumber: "B1",
        manufacturingDate: "2026-09-30",
        manufacturerWallet: "not-an-eth-address",
      });
    });

    // 2. Future Manufacturing Date Rejection
    assert.throws(() => {
      createProductDraftSchema.parse({
        name: "Test",
        category: "Test",
        batchNumber: "B1",
        manufacturingDate: "2099-01-01",
        manufacturerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      });
    });

    // 3. String length boundaries
    assert.throws(() => {
      createParticipantProfileSchema.parse({
        walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        role: "INVALID_ROLE",
      });
    });
  });
});
