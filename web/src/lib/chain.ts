import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// Role enum mapping
export const CHAIN_ROLE_MAP: Record<number, "MANUFACTURER" | "DISTRIBUTOR" | "RETAILER"> = {
  1: "MANUFACTURER",
  2: "DISTRIBUTOR",
  3: "RETAILER",
};

export const DB_TO_CHAIN_ROLE_MAP: Record<string, number> = {
  MANUFACTURER: 1,
  DISTRIBUTOR: 2,
  RETAILER: 3,
};

// Status enum mapping
export const CHAIN_STATUS_MAP: Record<
  number,
  "CREATED" | "IN_TRANSIT" | "AT_DISTRIBUTOR" | "AT_RETAILER" | "SOLD"
> = {
  0: "CREATED",
  1: "IN_TRANSIT",
  2: "AT_DISTRIBUTOR",
  3: "AT_RETAILER",
  4: "SOLD",
};

// EventType enum mapping
export const CHAIN_EVENT_TYPE_MAP: Record<
  number,
  | "REGISTERED"
  | "TRANSFER_INITIATED"
  | "TRANSFER_ACCEPTED"
  | "TRANSFER_REJECTED"
  | "LOCATION_UPDATE"
  | "SOLD"
> = {
  0: "REGISTERED",
  1: "TRANSFER_INITIATED",
  2: "TRANSFER_ACCEPTED",
  3: "TRANSFER_REJECTED",
  4: "LOCATION_UPDATE",
  5: "SOLD",
};

export function normalizeAddress(address: string): string {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return address.toLowerCase();
}

export interface DeploymentMetadata {
  address: string;
  chainId: number;
  deployBlock: number;
}

export function getDeploymentMetadata(): DeploymentMetadata | null {
  try {
    const deploymentPath = path.resolve(process.cwd(), "src/lib/contract/deployment.json");
    if (fs.existsSync(deploymentPath)) {
      const data = fs.readFileSync(deploymentPath, "utf8");
      return JSON.parse(data) as DeploymentMetadata;
    }
  } catch (err) {
    console.warn("Could not read deployment.json:", err);
  }
  return null;
}

export function getContractAbi(): ethers.InterfaceAbi | null {
  try {
    const abiPath = path.resolve(process.cwd(), "src/lib/contract/SupplyChain.abi.json");
    if (fs.existsSync(abiPath)) {
      const data = fs.readFileSync(abiPath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not read SupplyChain.abi.json:", err);
  }
  return null;
}

export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl =
    process.env.RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getReadOnlyContract(): ethers.Contract | null {
  const deployment = getDeploymentMetadata();
  const contractAddress =
    process.env.CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
    deployment?.address;
  const abi = getContractAbi();

  if (!contractAddress || !abi) {
    return null;
  }

  const provider = getProvider();
  return new ethers.Contract(contractAddress, abi, provider);
}

export interface ChainProductInfo {
  id: number;
  dataHash: string;
  manufacturer: string;
  currentOwner: string;
  pendingReceiver: string;
  status: number;
  statusName: string;
  createdAt: number;
}

export interface ChainHistoryInfo {
  eventType: number;
  eventTypeName: string;
  actor: string;
  counterparty: string;
  timestamp: number;
  location: string;
  note: string;
}

export async function getChainProduct(productId: number): Promise<ChainProductInfo | null> {
  const contract = getReadOnlyContract();
  if (!contract) {
    throw new Error("Contract is not deployed or ABI/Address missing");
  }

  try {
    const exists = await contract.exists(productId);
    if (!exists) return null;

    const p = await contract.getProduct(productId);
    const statusNum = Number(p.status);
    return {
      id: Number(p.id),
      dataHash: p.dataHash,
      manufacturer: p.manufacturer.toLowerCase(),
      currentOwner: p.currentOwner.toLowerCase(),
      pendingReceiver:
        p.pendingReceiver === ethers.ZeroAddress ? "" : p.pendingReceiver.toLowerCase(),
      status: statusNum,
      statusName: CHAIN_STATUS_MAP[statusNum] || "UNKNOWN",
      createdAt: Number(p.createdAt),
    };
  } catch {
    return null;
  }
}

export async function getChainHistory(productId: number): Promise<ChainHistoryInfo[]> {
  const contract = getReadOnlyContract();
  if (!contract) {
    throw new Error("Contract is not deployed or ABI/Address missing");
  }

  try {
    const history = await contract.getHistory(productId);
    return history.map((entry: any) => {
      const typeNum = Number(entry.eventType);
      return {
        eventType: typeNum,
        eventTypeName: CHAIN_EVENT_TYPE_MAP[typeNum] || "UNKNOWN",
        actor: entry.actor.toLowerCase(),
        counterparty:
          entry.counterparty === ethers.ZeroAddress ? "" : entry.counterparty.toLowerCase(),
        timestamp: Number(entry.timestamp),
        location: entry.location,
        note: entry.note,
      };
    });
  } catch {
    return [];
  }
}

export async function getChainParticipant(
  walletAddress: string
): Promise<{ role: number; roleName: string; active: boolean } | null> {
  const contract = getReadOnlyContract();
  if (!contract) {
    throw new Error("Contract is not deployed or ABI/Address missing");
  }

  try {
    const [roleNum, active] = await contract.getParticipant(walletAddress);
    const role = Number(roleNum);
    return {
      role,
      roleName: CHAIN_ROLE_MAP[role] || "NONE",
      active,
    };
  } catch {
    return null;
  }
}

export async function getChainAdmin(): Promise<string | null> {
  const contract = getReadOnlyContract();
  if (!contract) return null;
  try {
    const admin = await contract.admin();
    return String(admin).toLowerCase();
  } catch {
    return null;
  }
}

export async function isChainAdmin(walletAddress: string): Promise<boolean> {
  try {
    const admin = await getChainAdmin();
    if (!admin) return false;
    return admin === walletAddress.toLowerCase();
  } catch {
    return false;
  }
}

