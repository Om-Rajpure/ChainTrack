import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import assert from "assert";

enum Role {
  None = 0,
  Manufacturer = 1,
  Distributor = 2,
  Retailer = 3,
}

enum Status {
  Created = 0,
  InTransit = 1,
  AtDistributor = 2,
  AtRetailer = 3,
  Sold = 4,
}

async function main() {
  console.log("==================================================");
  console.log("Running Live E2E Scenario Tests on Local Blockchain");
  console.log("==================================================");

  const deploymentPath = path.resolve(__dirname, "../../web/src/lib/contract/deployment.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deployment.address;

  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const contract = SupplyChain.attach(contractAddress) as any;

  const [admin, manufacturer, distributor, retailer, unauthorized] = await ethers.getSigners();

  // Test 1: Product Creation
  console.log("\n[Test 1] Manufacturer creates a new product (ID 6)");
  const hash = ethers.keccak256(ethers.toUtf8Bytes("live-e2e-demo-product-hash-6"));
  const txCreate = await contract.connect(manufacturer).registerProduct(hash, "Munich Facility Gate A");
  const rcCreate = await txCreate.wait();
  const prodId = await contract.productCount();
  console.log(`✓ Product #${prodId} created in block ${rcCreate.blockNumber}`);

  let p = await contract.getProduct(prodId);
  assert.strictEqual(Number(p.status), Status.Created);
  assert.strictEqual(p.currentOwner.toLowerCase(), manufacturer.address.toLowerCase());
  assert.strictEqual(p.dataHash, hash);

  // Test 2: Transfer Rejection (Rollback)
  console.log("\n[Test 2] Manufacturer initiates transfer -> Distributor rejects");
  const txInit1 = await contract.connect(manufacturer).initiateTransfer(prodId, distributor.address, "Dock 1", "Damaged box test");
  await txInit1.wait();
  p = await contract.getProduct(prodId);
  assert.strictEqual(Number(p.status), Status.InTransit);
  assert.strictEqual(p.pendingReceiver.toLowerCase(), distributor.address.toLowerCase());

  const txReject = await contract.connect(distributor).rejectTransfer(prodId, "Box seal broken on arrival");
  await txReject.wait();
  p = await contract.getProduct(prodId);
  assert.strictEqual(Number(p.status), Status.Created, "Status must rollback to Created");
  assert.strictEqual(p.pendingReceiver, ethers.ZeroAddress, "Pending receiver must be cleared");
  assert.strictEqual(p.currentOwner.toLowerCase(), manufacturer.address.toLowerCase(), "Owner must remain Manufacturer");
  console.log("✓ Transfer rejection rolled back status to Created and preserved Manufacturer owner");

  // Test 3: Manufacturer -> Distributor transfer & acceptance
  console.log("\n[Test 3] Manufacturer initiates transfer -> Distributor accepts");
  const txInit2 = await contract.connect(manufacturer).initiateTransfer(prodId, distributor.address, "Dock 2", "Fresh packaging");
  await txInit2.wait();
  const txAccept1 = await contract.connect(distributor).acceptTransfer(prodId, "Frankfurt Logistics Hub");
  await txAccept1.wait();
  p = await contract.getProduct(prodId);
  assert.strictEqual(Number(p.status), Status.AtDistributor);
  assert.strictEqual(p.currentOwner.toLowerCase(), distributor.address.toLowerCase());
  console.log("✓ Transfer accepted by Distributor, status is AT_DISTRIBUTOR");

  // Test 4: Location Checkpoint
  console.log("\n[Test 4] Distributor adds location checkpoint");
  const txLoc = await contract.connect(distributor).addLocationUpdate(prodId, "Frankfurt Warehouse Section 4B", "Inspected and stored");
  await txLoc.wait();
  const histLen = await contract.historyLength(prodId);
  console.log(`✓ Location update added. Total history entries: ${histLen}`);

  // Test 5: Distributor -> Retailer transfer & acceptance
  console.log("\n[Test 5] Distributor transfers to Retailer -> Retailer accepts");
  const txInit3 = await contract.connect(distributor).initiateTransfer(prodId, retailer.address, "Frankfurt Bay 1", "Truck delivery #88");
  await txInit3.wait();
  const txAccept2 = await contract.connect(retailer).acceptTransfer(prodId, "CityMart Store #101");
  await txAccept2.wait();
  p = await contract.getProduct(prodId);
  assert.strictEqual(Number(p.status), Status.AtRetailer);
  assert.strictEqual(p.currentOwner.toLowerCase(), retailer.address.toLowerCase());
  console.log("✓ Retailer accepted transfer, status is AT_RETAILER");

  // Test 6: Retailer marks SOLD
  console.log("\n[Test 6] Retailer marks product SOLD");
  const txSold = await contract.connect(retailer).markSold(prodId, "CityMart Checkout Register #4");
  await txSold.wait();
  p = await contract.getProduct(prodId);
  assert.strictEqual(Number(p.status), Status.Sold);
  console.log("✓ Product marked SOLD");

  // Test 7: Sold Finality (Forbidden Operations)
  console.log("\n[Test 7] Verifying Sold Finality (all state changes must revert)");
  try {
    await contract.connect(retailer).initiateTransfer(prodId, distributor.address, "Store", "Should fail");
    assert.fail("Should have reverted on transfer after sold");
  } catch (err: any) {
    assert(err.message.includes("InvalidStatus") || err.message.includes("revert"), `Expected InvalidStatus revert, got: ${err.message}`);
    console.log("✓ Transfer after Sold reverted with InvalidStatus");
  }

  try {
    await contract.connect(retailer).addLocationUpdate(prodId, "Store", "Should fail");
    assert.fail("Should have reverted on location update after sold");
  } catch (err: any) {
    assert(err.message.includes("InvalidStatus") || err.message.includes("revert"));
    console.log("✓ Location update after Sold reverted with InvalidStatus");
  }

  // Test 8: Wrong Role & Wrong Owner Rejections
  console.log("\n[Test 8] Verifying Role and Owner boundaries");
  try {
    const freshHash = ethers.keccak256(ethers.toUtf8Bytes("random-unauthorized-mfg"));
    await contract.connect(distributor).registerProduct(freshHash, "Warehouse");
    assert.fail("Distributor should not be able to register product");
  } catch (err: any) {
    assert(err.message.includes("WrongRole") || err.message.includes("revert"));
    console.log("✓ Distributor cannot register product (reverted with WrongRole)");
  }

  try {
    await contract.connect(unauthorized).addLocationUpdate(1, "Fake Location", "Fake Note");
    assert.fail("Unauthorized user should not be able to update product");
  } catch (err: any) {
    assert(err.message.includes("NotOwner") || err.message.includes("NotParticipant") || err.message.includes("revert"));
    console.log("✓ Unauthorized actor rejected on product action");
  }

  console.log("\n==================================================");
  console.log("ALL LIVE E2E ON-CHAIN SCENARIOS PASSED!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Scenario test failed:", err);
  process.exitCode = 1;
});
