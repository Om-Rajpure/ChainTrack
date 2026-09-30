import { ethers, artifacts, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\n==================================================");
    console.error("[ERROR] Deployment blocked: No signer account available.");
    console.error("For Sepolia: Please define DEPLOYER_PRIVATE_KEY in your .env file.");
    console.error("For Local: Ensure hardhat node is running.");
    console.error("==================================================");
    process.exit(1);
  }
  const deployer = signers[0];
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const networkName = network.name || (chainId === 11155111 ? "sepolia" : "localhost");

  console.log("==================================================");
  console.log(`ChainTrack — Deploying to ${networkName.toUpperCase()} (Chain ID: ${chainId})`);
  console.log("==================================================");
  console.log("Deployer Address :", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance : ${ethers.formatEther(balance)} ETH`);

  if (chainId === 11155111 && balance === 0n) {
    console.error("\n[ERROR] Sepolia deployment blocked: Deployer account has 0 ETH.");
    console.error("Please fund your deployer wallet with Sepolia test ETH and re-run.");
    process.exit(1);
  }

  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy();
  await supplyChain.waitForDeployment();

  const address = await supplyChain.getAddress();
  const deploymentTx = supplyChain.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;
  const deployBlock = receipt ? receipt.blockNumber : await ethers.provider.getBlockNumber();

  console.log("--------------------------------------------------");
  console.log("SupplyChain deployed successfully!");
  console.log("Contract Address :", address);
  console.log("Chain ID         :", chainId);
  console.log("Deploy Block     :", deployBlock);
  console.log("Deployer Address :", deployer.address);
  console.log("Deployment Tx    :", deploymentTx?.hash || "N/A");
  console.log("--------------------------------------------------");

  const deploymentMetadata = {
    network: networkName,
    chainId,
    address,
    contractAddress: address,
    deployer: deployer.address,
    deployBlock,
    deploymentTxHash: deploymentTx?.hash || null,
    deployedAt: new Date().toISOString(),
  };

  // 1. Write network-specific record: contracts/deployments/{network}.json
  const contractsDeployDir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(contractsDeployDir)) {
    fs.mkdirSync(contractsDeployDir, { recursive: true });
  }
  const networkDeployPath = path.join(contractsDeployDir, `${networkName}.json`);
  fs.writeFileSync(networkDeployPath, JSON.stringify(deploymentMetadata, null, 2), "utf8");
  console.log(`Network deployment artifact saved to: ${networkDeployPath}`);

  // 2. Write active web contract deployment: web/src/lib/contract/deployment.json
  const webContractDir = path.resolve(__dirname, "../../web/src/lib/contract");
  if (!fs.existsSync(webContractDir)) {
    fs.mkdirSync(webContractDir, { recursive: true });
  }
  const webDeployPath = path.join(webContractDir, "deployment.json");
  fs.writeFileSync(webDeployPath, JSON.stringify(deploymentMetadata, null, 2), "utf8");
  console.log(`Web active deployment metadata saved to: ${webDeployPath}`);

  // 3. Write contract ABI: web/src/lib/contract/SupplyChain.abi.json
  const artifact = await artifacts.readArtifact("SupplyChain");
  const abiPath = path.join(webContractDir, "SupplyChain.abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2), "utf8");
  console.log(`Contract ABI saved to: ${abiPath}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
