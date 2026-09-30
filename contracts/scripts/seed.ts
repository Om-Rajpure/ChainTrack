import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Enum definitions matching SupplyChain.sol
enum Role {
  None = 0,
  Manufacturer = 1,
  Distributor = 2,
  Retailer = 3,
}

async function main() {
  console.log("==================================================");
  console.log("ChainTrack — Seeding Local Demo Blockchain & Data");
  console.log("==================================================");

  // Read deployment metadata
  const deploymentPath = path.resolve(__dirname, "../../web/src/lib/contract/deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found! Please run 'npm run deploy:local' first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deployment.address;
  console.log("Attaching to deployed SupplyChain at:", contractAddress);

  const SupplyChainFactory = await ethers.getContractFactory("SupplyChain");
  const contract = SupplyChainFactory.attach(contractAddress) as any;

  const [admin, manufacturer, distributor, retailer, extraDistributor] = await ethers.getSigners();

  console.log("\n1. Registering Demo Participants On-Chain:");
  console.log(`   Admin (Deployer)   : ${admin.address}`);
  console.log(`   Manufacturer (#1)  : ${manufacturer.address} (Acme Manufacturing Ltd.)`);
  console.log(`   Distributor (#2)   : ${distributor.address} (FastMove Logistics)`);
  console.log(`   Retailer (#3)      : ${retailer.address} (CityMart Retail)`);
  console.log(`   Extra Dist (#4)    : ${extraDistributor.address} (Apex Global Logistics)`);

  const participantsToRegister = [
    { signer: manufacturer, role: Role.Manufacturer, name: "Manufacturer" },
    { signer: distributor, role: Role.Distributor, name: "Distributor" },
    { signer: retailer, role: Role.Retailer, name: "Retailer" },
    { signer: extraDistributor, role: Role.Distributor, name: "Extra Distributor" },
  ];

  for (const p of participantsToRegister) {
    const [existingRole] = await contract.getParticipant(p.signer.address);
    if (Number(existingRole) === Role.None) {
      const tx = await contract.connect(admin).registerParticipant(p.signer.address, p.role);
      await tx.wait();
      console.log(`   ✓ Registered ${p.name} on-chain`);
    } else {
      console.log(`   - ${p.name} is already registered (Role: ${existingRole})`);
    }
  }

  console.log("\n2. Creating 5 Demo Lifecycle Products:");

  // Helper for computing sample hash
  const makeHash = (label: string) => ethers.keccak256(ethers.toUtf8Bytes(`chaintrack-demo-${label}`));

  // Product 1: Status = Created
  const hash1 = makeHash("product-1-created");
  const tx1 = await contract.connect(manufacturer).registerProduct(hash1, "Munich Facility Plant 1");
  await tx1.wait();
  const id1 = await contract.productCount();
  console.log(`   ✓ Product #${id1} registered -> Status: CREATED (Owner: Manufacturer)`);

  // Product 2: Status = InTransit (Manufacturer -> Distributor)
  const hash2 = makeHash("product-2-intransit");
  const tx2 = await contract.connect(manufacturer).registerProduct(hash2, "Berlin Factory Plant 2");
  await tx2.wait();
  const id2 = await contract.productCount();
  const tx2Transfer = await contract
    .connect(manufacturer)
    .initiateTransfer(id2, distributor.address, "Outbound Logistics Gate 1", "Scheduled express freight");
  await tx2Transfer.wait();
  console.log(`   ✓ Product #${id2} in transit -> Status: IN_TRANSIT (Pending: Distributor)`);

  // Product 3: Status = AtDistributor
  const hash3 = makeHash("product-3-atdistributor");
  const tx3 = await contract.connect(manufacturer).registerProduct(hash3, "Hamburg Electronics Plant");
  await tx3.wait();
  const id3 = await contract.productCount();
  await (
    await contract
      .connect(manufacturer)
      .initiateTransfer(id3, distributor.address, "Cargo Terminal 4", "Air shipment arrived")
  ).wait();
  await (await contract.connect(distributor).acceptTransfer(id3, "Central Distribution Center Frankfurt")).wait();
  await (
    await contract
      .connect(distributor)
      .addLocationUpdate(
        id3,
        "Central Distribution Center Frankfurt - Cold Storage",
        "Passed temperature verification (4°C)"
      )
  ).wait();
  console.log(`   ✓ Product #${id3} accepted -> Status: AT_DISTRIBUTOR (Owner: Distributor)`);

  // Product 4: Status = AtRetailer
  const hash4 = makeHash("product-4-atretailer");
  const tx4 = await contract.connect(manufacturer).registerProduct(hash4, "Stuttgart Precision Works");
  await tx4.wait();
  const id4 = await contract.productCount();
  await (
    await contract
      .connect(manufacturer)
      .initiateTransfer(id4, distributor.address, "Dispatch Dock 2", "Pallet Batch 404")
  ).wait();
  await (await contract.connect(distributor).acceptTransfer(id4, "Stuttgart Distribution Depot")).wait();
  await (
    await contract
      .connect(distributor)
      .initiateTransfer(id4, retailer.address, "Outbound Bay 3", "Final leg store delivery")
  ).wait();
  await (await contract.connect(retailer).acceptTransfer(id4, "CityMart Retail Store #101")).wait();
  await (
    await contract
      .connect(retailer)
      .addLocationUpdate(id4, "CityMart Retail Store #101 - Aisle 3 Display", "Placed on main sales display")
  ).wait();
  console.log(`   ✓ Product #${id4} accepted -> Status: AT_RETAILER (Owner: Retailer)`);

  // Product 5: Status = Sold
  const hash5 = makeHash("product-5-sold");
  const tx5 = await contract.connect(manufacturer).registerProduct(hash5, "Munich Facility Plant 1");
  await tx5.wait();
  const id5 = await contract.productCount();
  await (
    await contract
      .connect(manufacturer)
      .initiateTransfer(id5, distributor.address, "Factory Dock", "Direct to Hub")
  ).wait();
  await (await contract.connect(distributor).acceptTransfer(id5, "Munich Hub")).wait();
  await (
    await contract
      .connect(distributor)
      .initiateTransfer(id5, retailer.address, "Hub Gate", "To Store")
  ).wait();
  await (await contract.connect(retailer).acceptTransfer(id5, "CityMart Retail Store #101")).wait();
  await (await contract.connect(retailer).markSold(id5, "POS Terminal #2 Checkout")).wait();
  console.log(`   ✓ Product #${id5} marked sold -> Status: SOLD (Final)`);

  console.log("\n==================================================");
  console.log("Seeding complete! 5 demo products created.");
  console.log("Run 'POST /api/sync' or the indexer to sync to PostgreSQL.");
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Seed script failed:", error);
  process.exitCode = 1;
});
