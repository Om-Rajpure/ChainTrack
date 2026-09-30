"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import {
  Wallet,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  Key,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const {
    account,
    role,
    isActive,
    isAuthenticated,
    connectWallet,
    signInWithEthereum,
    isConnecting,
    isSigningIn,
  } = useWallet();

  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    const success = await signInWithEthereum();
    if (success) {
      router.push("/dashboard");
    }
  };

  const demoAccounts = [
    { role: "Admin / Deployer", index: "#0", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", badge: "bg-red-950/60 text-red-400 border-red-800" },
    { role: "Manufacturer (PharmaCorp)", index: "#1", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", badge: "bg-blue-950/60 text-blue-400 border-blue-800" },
    { role: "Distributor (FastLogistics)", index: "#2", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", badge: "bg-purple-950/60 text-purple-400 border-purple-800" },
    { role: "Retailer (MediStore)", index: "#3", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", badge: "bg-indigo-950/60 text-indigo-400 border-indigo-800" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">Participant Authentication</h1>
        <p className="text-sm text-slate-400">
          Sign-In with Ethereum (EIP-4361). Authenticate your role and manage supply chain custody.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Sign In Action Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <span>Connect & Authenticate</span>
          </h2>

          {!account ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your MetaMask wallet to interact with the ChainTrack smart contract.
              </p>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition text-sm disabled:opacity-50 shadow-lg shadow-emerald-950/40"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? "Connecting Wallet..." : "Connect MetaMask"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <span className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                  Connected Wallet
                </span>
                <span className="font-mono text-xs text-emerald-400 break-all block">{account}</span>

                <div className="mt-3 pt-3 border-t border-slate-900 flex items-center justify-between text-xs">
                  <span className="text-slate-400">On-Chain Role:</span>
                  <span className="font-semibold text-white uppercase">{role}</span>
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="space-y-3">
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition text-sm disabled:opacity-50 shadow-lg shadow-emerald-950/40"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isSigningIn ? "Verifying Signature..." : "Sign In with Ethereum (SIWE)"}</span>
                  </button>
                  <p className="text-[11px] text-slate-500 text-center">
                    Requests a single-use nonce and cryptographic signature without spending gas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Authenticated session active (12h JWT).</span>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl border border-slate-700 transition text-sm"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Demo Accounts Reference */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 text-xs">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Local Hardhat Demo Wallets</span>
          </h3>
          <p className="text-slate-400 mb-4 text-[11px]">
            For local testing, import the pre-funded Hardhat private keys into MetaMask:
          </p>

          <div className="space-y-3">
            {demoAccounts.map((acc, idx) => (
              <div key={idx} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-200">{acc.role}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${acc.badge}`}>
                    Account {acc.index}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500 block truncate">{acc.address}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
