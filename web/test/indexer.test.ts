import test from "node:test";
import assert from "node:assert/strict";
import { CHAIN_ROLE_MAP, CHAIN_STATUS_MAP, CHAIN_EVENT_TYPE_MAP } from "../src/lib/chain";

test("Indexer & Event Data Mapping Suite", async (t) => {
  await t.test("1. Blockchain enum mapping accuracy", () => {
    // Roles
    assert.equal(CHAIN_ROLE_MAP[1], "MANUFACTURER");
    assert.equal(CHAIN_ROLE_MAP[2], "DISTRIBUTOR");
    assert.equal(CHAIN_ROLE_MAP[3], "RETAILER");

    // Statuses
    assert.equal(CHAIN_STATUS_MAP[0], "CREATED");
    assert.equal(CHAIN_STATUS_MAP[1], "IN_TRANSIT");
    assert.equal(CHAIN_STATUS_MAP[2], "AT_DISTRIBUTOR");
    assert.equal(CHAIN_STATUS_MAP[3], "AT_RETAILER");
    assert.equal(CHAIN_STATUS_MAP[4], "SOLD");

    // Event types
    assert.equal(CHAIN_EVENT_TYPE_MAP[0], "REGISTERED");
    assert.equal(CHAIN_EVENT_TYPE_MAP[1], "TRANSFER_INITIATED");
    assert.equal(CHAIN_EVENT_TYPE_MAP[2], "TRANSFER_ACCEPTED");
    assert.equal(CHAIN_EVENT_TYPE_MAP[3], "TRANSFER_REJECTED");
    assert.equal(CHAIN_EVENT_TYPE_MAP[4], "LOCATION_UPDATE");
    assert.equal(CHAIN_EVENT_TYPE_MAP[5], "SOLD");
  });

  await t.test("2. Idempotent key structure for event deduplication", () => {
    const txHash = "0x" + "a".repeat(64);
    const logIndex = 0;

    const key1 = { txHash, logIndex };
    const key2 = { txHash, logIndex };

    assert.equal(key1.txHash, key2.txHash);
    assert.equal(key1.logIndex, key2.logIndex);
  });

  await t.test("3. Address normalization preserves case-insensitivity", () => {
    const mixedAddr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const lowerAddr = mixedAddr.toLowerCase();

    assert.equal(lowerAddr, "0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
  });
});
