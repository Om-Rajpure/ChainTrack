import { ethers } from "hardhat";
import * as assert from "assert";

async function main() {
  console.log("Running Phase 2 Smoke Validation...");

  const [adminSigner, mfgSigner, distSigner, retSigner, otherSigner] = await ethers.getSigners();
  
  // Attach to deployed contract or deploy fresh for smoke validation
  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const contract = await SupplyChain.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("Smoke Test Contract Deployed at:", contractAddress);

  // 1. Check Admin
  const adminAddress = await contract.admin();
  assert.strictEqual(adminAddress, adminSigner.address, "Admin must be deployer");
  console.log("✓ Admin check passed:", adminAddress);

  // 2. Check initial productCount
  const count0 = await contract.productCount();
  assert.strictEqual(count0, 0n, "Initial productCount must be 0");
  console.log("✓ Initial product count is 0");

  // 3. Register Participants (Admin only)
  // Role: None=0, Manufacturer=1, Distributor=2, Retailer=3
  await (await contract.connect(adminSigner).registerParticipant(mfgSigner.address, 1)).wait();
  await (await contract.connect(adminSigner).registerParticipant(distSigner.address, 2)).wait();
  await (await contract.connect(adminSigner).registerParticipant(retSigner.address, 3)).wait();

  const [mfgRole, mfgActive] = await contract.getParticipant(mfgSigner.address);
  assert.strictEqual(Number(mfgRole), 1, "Manufacturer role must be 1");
  assert.strictEqual(mfgActive, true, "Manufacturer must be active");
  console.log("✓ Participant registration passed");

  // 4. Register Product
  const sampleHash1 = ethers.keccak256(ethers.toUtf8Bytes("product-1-metadata"));
  const regTx = await contract.connect(mfgSigner).registerProduct(sampleHash1, "Warehouse A, City");
  await regTx.wait();

  const count1 = await contract.productCount();
  assert.strictEqual(count1, 1n, "Product count should be 1");

  const p1 = await contract.getProduct(1);
  assert.strictEqual(p1.id, 1n);
  assert.strictEqual(p1.dataHash, sampleHash1);
  assert.strictEqual(p1.manufacturer, mfgSigner.address);
  assert.strictEqual(p1.currentOwner, mfgSigner.address);
  assert.strictEqual(p1.pendingReceiver, ethers.ZeroAddress);
  assert.strictEqual(Number(p1.status), 0); // Created
  console.log("✓ Product 1 registered successfully");

  // 5. Initiate Transfer (Manufacturer -> Distributor)
  await (await contract.connect(mfgSigner).initiateTransfer(1, distSigner.address, "Dock 4", "Dispatched via Truck")).wait();
  const p1InTransit = await contract.getProduct(1);
  assert.strictEqual(Number(p1InTransit.status), 1); // InTransit
  assert.strictEqual(p1InTransit.pendingReceiver, distSigner.address);
  assert.strictEqual(p1InTransit.currentOwner, mfgSigner.address); // Owner does not change yet
  console.log("✓ Transfer initiation to Distributor verified (owner unchanged, InTransit set)");

  // 6. Accept Transfer (Distributor)
  await (await contract.connect(distSigner).acceptTransfer(1, "Distribution Hub North")).wait();
  const p1AtDist = await contract.getProduct(1);
  assert.strictEqual(Number(p1AtDist.status), 2); // AtDistributor
  assert.strictEqual(p1AtDist.currentOwner, distSigner.address);
  assert.strictEqual(p1AtDist.pendingReceiver, ethers.ZeroAddress);
  console.log("✓ Transfer accepted by Distributor (owner updated, status AtDistributor)");

  // 7. Add Location Update
  await (await contract.connect(distSigner).addLocationUpdate(1, "Distribution Hub North - Cold Storage", "Temperature check passed")).wait();
  console.log("✓ Location update added");

  // 8. Initiate Transfer to Retailer then Reject (to test rollback)
  await (await contract.connect(distSigner).initiateTransfer(1, retSigner.address, "Transit to Store", "Delivery Batch 99")).wait();
  await (await contract.connect(retSigner).rejectTransfer(1, "Damaged shipment box")).wait();
  const p1RolledBack = await contract.getProduct(1);
  assert.strictEqual(Number(p1RolledBack.status), 2); // AtDistributor
  assert.strictEqual(p1RolledBack.currentOwner, distSigner.address); // Remains distributor
  assert.strictEqual(p1RolledBack.pendingReceiver, ethers.ZeroAddress);
  console.log("✓ Transfer rejection rolled back status to AtDistributor and preserved ownership");

  // 9. Re-initiate and Accept by Retailer
  await (await contract.connect(distSigner).initiateTransfer(1, retSigner.address, "Transit to Store Re-sent", "Replacement packaging")).wait();
  await (await contract.connect(retSigner).acceptTransfer(1, "Downtown Retail Store #12")).wait();
  const p1AtRetailer = await contract.getProduct(1);
  assert.strictEqual(Number(p1AtRetailer.status), 3); // AtRetailer
  assert.strictEqual(p1AtRetailer.currentOwner, retSigner.address);
  console.log("✓ Transfer accepted by Retailer (status AtRetailer)");

  // 10. Mark Sold
  await (await contract.connect(retSigner).markSold(1, "POS Register 3")).wait();
  const p1Sold = await contract.getProduct(1);
  assert.strictEqual(Number(p1Sold.status), 4); // Sold
  console.log("✓ Product marked Sold");

  // 11. Verify History
  const history = await contract.getHistory(1);
  assert.strictEqual(history.length, 9, "History should have 9 recorded lifecycle events");
  console.log("✓ Lifecycle history verified with", history.length, "entries:");
  const eventNames = ["Registered", "TransferInitiated", "TransferAccepted", "TransferRejected", "LocationUpdate", "Sold"];
  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    console.log(`  [${i + 1}] Event: ${eventNames[Number(entry.eventType)]}, Actor: ${entry.actor}, Location: "${entry.location}", Note: "${entry.note}"`);
  }

  console.log("\n==========================================");
  console.log("All Phase 2 Smoke Validations PASSED! ✓");
  console.log("==========================================");
}

main().catch((error) => {
  console.error("Smoke validation failed:", error);
  process.exitCode = 1;
});
