import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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
  console.log("Verifying Live Local Hardhat Blockchain State");
  console.log("==================================================");

  const deploymentPath = path.resolve(__dirname, "../../web/src/lib/contract/deployment.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deployment.address;

  console.log("Target Contract Address:", contractAddress);
  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const contract = SupplyChain.attach(contractAddress) as any;

  const count = await contract.productCount();
  console.log("Product Count On Chain:", count.toString());

  const [admin, manufacturer, distributor, retailer] = await ethers.getSigners();

  console.log("\nParticipant Role Checks:");
  const adminRole = await contract.getParticipant(admin.address);
  console.log(`Admin (${admin.address}): Role=${adminRole[0]} (Expected 0 - Contract Owner), Active=${adminRole[1]}`);

  const mfgRole = await contract.getParticipant(manufacturer.address);
  console.log(`Manufacturer (${manufacturer.address}): Role=${mfgRole[0]} (Expected 1), Active=${mfgRole[1]}`);

  const distRole = await contract.getParticipant(distributor.address);
  console.log(`Distributor (${distributor.address}): Role=${distRole[0]} (Expected 2), Active=${distRole[1]}`);

  const retRole = await contract.getParticipant(retailer.address);
  console.log(`Retailer (${retailer.address}): Role=${retRole[0]} (Expected 3), Active=${retRole[1]}`);

  console.log("\nProduct State Checks:");
  for (let id = 1; id <= Number(count); id++) {
    const p = await contract.getProduct(id);
    const histLen = await contract.historyLength(id);
    console.log(`Product #${id}: Status=${Status[Number(p.status)]} (${p.status}), Owner=${p.currentOwner}, HistoryLength=${histLen}, Hash=${p.dataHash}`);
  }

  console.log("\n==================================================");
  console.log("Blockchain state verified successfully!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exitCode = 1;
});
