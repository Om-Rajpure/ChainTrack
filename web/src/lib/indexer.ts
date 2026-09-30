import { ethers } from "ethers";
import { prisma } from "./db";
import {
  getReadOnlyContract,
  getProvider,
  getDeploymentMetadata,
  CHAIN_ROLE_MAP,
  CHAIN_STATUS_MAP,
} from "./chain";

export interface IndexerSyncResult {
  synced: boolean;
  fromBlock: number;
  toBlock: number;
  eventsProcessed: number;
  affectedProducts: number[];
  message: string;
}

/**
 * Runs a single idempotent batch synchronization loop for the event indexer.
 * Scans contract event logs, mirrors them into ProductEvent / Participant tables,
 * takes fresh on-chain state snapshots for affected products, and updates the block cursor.
 */
export async function runIndexerSync(): Promise<IndexerSyncResult> {
  const contract = getReadOnlyContract();
  if (!contract) {
    return {
      synced: false,
      fromBlock: 0,
      toBlock: 0,
      eventsProcessed: 0,
      affectedProducts: [],
      message: "SupplyChain contract or deployment metadata is missing",
    };
  }

  const provider = getProvider();
  const deployment = getDeploymentMetadata();
  const chainId = deployment?.chainId || 31337;
  const deployBlock = deployment?.deployBlock || 0;

  // Confirmations: 0 on local chain (31337), 2 on public testnets (11155111 Sepolia)
  const confirmations = chainId === 31337 ? 0 : 2;
  const latestBlock = await provider.getBlockNumber();
  const targetBlock = Math.max(0, latestBlock - confirmations);

  // 1. Retrieve or initialize the IndexerState block cursor
  let indexerState = await prisma.indexerState.findUnique({
    where: { id: "main" },
  });

  if (!indexerState) {
    const initialCursor = Math.max(0, deployBlock > 0 ? deployBlock - 1 : 0);
    indexerState = await prisma.indexerState.create({
      data: {
        id: "main",
        lastProcessedBlock: initialCursor,
      },
    });
  }

  const fromBlock = indexerState.lastProcessedBlock + 1;
  if (fromBlock > targetBlock) {
    return {
      synced: true,
      fromBlock,
      toBlock: targetBlock,
      eventsProcessed: 0,
      affectedProducts: [],
      message: `Already up to date at block ${indexerState.lastProcessedBlock}`,
    };
  }

  // Batch chunking: process up to 2000 blocks per sync iteration
  const toBlock = Math.min(targetBlock, fromBlock + 1999);

  // 2. Query event logs in the block window
  const logs = await contract.queryFilter("*", fromBlock, toBlock);

  let eventsProcessed = 0;
  const affectedProductIds = new Set<number>();

  for (const log of logs) {
    if (!("fragment" in log) || !log.fragment) continue;

    const eventName = log.fragment.name;
    const txHash = log.transactionHash;
    const logIndex = log.index;
    const blockNumber = log.blockNumber;

    // Fetch block timestamp
    const block = await provider.getBlock(blockNumber);
    const blockTimestamp = block ? new Date(block.timestamp * 1000) : new Date();

    const args = (log as ethers.EventLog).args;

    switch (eventName) {
      case "ParticipantRegistered": {
        const wallet = String(args[0]).toLowerCase();
        const roleNum = Number(args[1]);
        const role = CHAIN_ROLE_MAP[roleNum];

        if (role) {
          await prisma.participant.upsert({
            where: { walletAddress: wallet },
            create: {
              walletAddress: wallet,
              role,
              isActive: true,
            },
            update: {
              role,
              isActive: true,
            },
          });
          eventsProcessed++;
        }
        break;
      }

      case "ParticipantStatusChanged": {
        const wallet = String(args[0]).toLowerCase();
        const active = Boolean(args[1]);

        await prisma.participant.updateMany({
          where: { walletAddress: wallet },
          data: { isActive: active },
        });
        eventsProcessed++;
        break;
      }

      case "ProductRegistered": {
        const productId = Number(args[0]);
        const manufacturer = String(args[1]).toLowerCase();
        const dataHash = String(args[2]);
        const location = String(args[3]);

        affectedProductIds.add(productId);

        // Upsert ProductEvent (Idempotent by txHash + logIndex)
        await prisma.productEvent.upsert({
          where: {
            txHash_logIndex: {
              txHash,
              logIndex,
            },
          },
          create: {
            chainProductId: productId,
            eventType: "REGISTERED",
            actor: manufacturer,
            counterparty: null,
            location: location || null,
            note: null,
            blockNumber,
            blockTimestamp,
            txHash,
            logIndex,
          },
          update: {},
        });

        // Link with matching draft Product in database
        await prisma.product.updateMany({
          where: {
            dataHash,
            isConfirmed: false,
          },
          data: {
            chainProductId: productId,
            isConfirmed: true,
            registrationTxHash: txHash,
            draftExpiresAt: null,
          },
        });

        eventsProcessed++;
        break;
      }

      case "TransferInitiated": {
        const productId = Number(args[0]);
        const from = String(args[1]).toLowerCase();
        const to = String(args[2]).toLowerCase();
        const location = String(args[3]);
        const note = String(args[4]);

        affectedProductIds.add(productId);

        await prisma.productEvent.upsert({
          where: {
            txHash_logIndex: {
              txHash,
              logIndex,
            },
          },
          create: {
            chainProductId: productId,
            eventType: "TRANSFER_INITIATED",
            actor: from,
            counterparty: to,
            location: location || null,
            note: note || null,
            blockNumber,
            blockTimestamp,
            txHash,
            logIndex,
          },
          update: {},
        });
        eventsProcessed++;
        break;
      }

      case "TransferAccepted": {
        const productId = Number(args[0]);
        const by = String(args[1]).toLowerCase();
        const location = String(args[2]);

        affectedProductIds.add(productId);

        await prisma.productEvent.upsert({
          where: {
            txHash_logIndex: {
              txHash,
              logIndex,
            },
          },
          create: {
            chainProductId: productId,
            eventType: "TRANSFER_ACCEPTED",
            actor: by,
            counterparty: null,
            location: location || null,
            note: null,
            blockNumber,
            blockTimestamp,
            txHash,
            logIndex,
          },
          update: {},
        });
        eventsProcessed++;
        break;
      }

      case "TransferRejected": {
        const productId = Number(args[0]);
        const by = String(args[1]).toLowerCase();
        const reason = String(args[2]);

        affectedProductIds.add(productId);

        await prisma.productEvent.upsert({
          where: {
            txHash_logIndex: {
              txHash,
              logIndex,
            },
          },
          create: {
            chainProductId: productId,
            eventType: "TRANSFER_REJECTED",
            actor: by,
            counterparty: null,
            location: null,
            note: reason || null,
            blockNumber,
            blockTimestamp,
            txHash,
            logIndex,
          },
          update: {},
        });
        eventsProcessed++;
        break;
      }

      case "LocationUpdated": {
        const productId = Number(args[0]);
        const by = String(args[1]).toLowerCase();
        const location = String(args[2]);
        const note = String(args[3]);

        affectedProductIds.add(productId);

        await prisma.productEvent.upsert({
          where: {
            txHash_logIndex: {
              txHash,
              logIndex,
            },
          },
          create: {
            chainProductId: productId,
            eventType: "LOCATION_UPDATE",
            actor: by,
            counterparty: null,
            location: location || null,
            note: note || null,
            blockNumber,
            blockTimestamp,
            txHash,
            logIndex,
          },
          update: {},
        });
        eventsProcessed++;
        break;
      }

      case "ProductSold": {
        const productId = Number(args[0]);
        const by = String(args[1]).toLowerCase();
        const location = String(args[2]);

        affectedProductIds.add(productId);

        await prisma.productEvent.upsert({
          where: {
            txHash_logIndex: {
              txHash,
              logIndex,
            },
          },
          create: {
            chainProductId: productId,
            eventType: "SOLD",
            actor: by,
            counterparty: null,
            location: location || null,
            note: null,
            blockNumber,
            blockTimestamp,
            txHash,
            logIndex,
          },
          update: {},
        });
        eventsProcessed++;
        break;
      }
    }
  }

  // 3. State Snapshot Step: Overwrite currentStatus, currentOwner, pendingReceiver for all affected products
  for (const productId of Array.from(affectedProductIds)) {
    try {
      const p = await contract.getProduct(productId);
      const statusNum = Number(p.status);
      const currentStatus = CHAIN_STATUS_MAP[statusNum] || "CREATED";
      const currentOwner = String(p.currentOwner).toLowerCase();
      const pendingReceiver =
        p.pendingReceiver === ethers.ZeroAddress
          ? null
          : String(p.pendingReceiver).toLowerCase();

      await prisma.product.updateMany({
        where: { chainProductId: productId },
        data: {
          currentStatus,
          currentOwner,
          pendingReceiver,
          isConfirmed: true,
        },
      });
    } catch (snapshotErr) {
      console.warn(`Snapshot update for product ${productId} failed:`, snapshotErr);
    }
  }

  // 4. Update the IndexerState block cursor
  await prisma.indexerState.update({
    where: { id: "main" },
    data: {
      lastProcessedBlock: toBlock,
    },
  });

  return {
    synced: true,
    fromBlock,
    toBlock,
    eventsProcessed,
    affectedProducts: Array.from(affectedProductIds),
    message: `Processed ${eventsProcessed} events from block ${fromBlock} to ${toBlock}`,
  };
}
