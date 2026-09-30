"use client";

import React from "react";
import { useWallet } from "@/lib/wallet-context";
import { AlertTriangle } from "lucide-react";

export function NetworkBanner() {
  const { isCorrectNetwork, switchNetwork, chainId } = useWallet();
  const expectedChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337", 10);

  if (isCorrectNetwork || !chainId) return null;

  return (
    <div className="bg-amber-500 text-slate-950 font-medium px-4 py-2 text-sm flex items-center justify-between border-b border-amber-600">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-slate-950" />
        <span>
          <strong>Wrong Network:</strong> Connected to Chain ID {chainId}. ChainTrack requires Chain ID {expectedChainId} ({expectedChainId === 31337 ? "Hardhat Local Node" : "Sepolia Testnet"}).
        </span>
      </div>
      <button
        onClick={switchNetwork}
        className="bg-slate-950 text-white hover:bg-slate-800 px-3 py-1 rounded text-xs font-semibold transition"
      >
        Switch Network
      </button>
    </div>
  );
}
