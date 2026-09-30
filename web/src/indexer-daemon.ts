import { runIndexerSync } from "./lib/indexer";
import { getDeploymentMetadata } from "./lib/chain";

const isDev = process.env.NODE_ENV !== "production";
const POLL_INTERVAL_MS = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || (isDev ? "5000" : "15000"), 10);

let isRunning = true;

async function startIndexerDaemon() {
  const deployment = getDeploymentMetadata();
  const chainId = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID, 10) : (deployment?.chainId ?? "Unknown");
  const contractAddress = process.env.CONTRACT_ADDRESS || deployment?.address;
  const deployBlock = process.env.INDEXER_START_BLOCK ? parseInt(process.env.INDEXER_START_BLOCK, 10) : (deployment?.deployBlock ?? 0);

  console.log("==================================================");
  console.log("ChainTrack — Standalone Event Indexer Daemon");
  console.log("==================================================");
  console.log(`Network Chain ID : ${chainId}`);
  console.log(`Contract Address : ${contractAddress ?? "Not found"}`);
  console.log(`Deploy Block     : ${deployBlock}`);
  console.log(`Polling Interval : ${POLL_INTERVAL_MS} ms`);
  console.log("==================================================");

  if (!contractAddress) {
    console.error("Error: Contract address missing. Please set CONTRACT_ADDRESS or deploy contract first.");
    process.exit(1);
  }

  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT. Stopping indexer daemon gracefully...");
    isRunning = false;
  });

  process.on("SIGTERM", () => {
    console.log("\nReceived SIGTERM. Stopping indexer daemon gracefully...");
    isRunning = false;
  });

  while (isRunning) {
    try {
      const result = await runIndexerSync();
      if (result.eventsProcessed > 0) {
        console.log(`[${new Date().toISOString()}] Synced ${result.eventsProcessed} event(s) across blocks ${result.fromBlock}..${result.toBlock}`);
      }
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] Indexer sync iteration error:`, err?.message || err);
    }

    if (isRunning) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  console.log("Indexer daemon stopped cleanly.");
  process.exit(0);
}

startIndexerDaemon().catch((err) => {
  console.error("Fatal indexer startup error:", err);
  process.exit(1);
});
