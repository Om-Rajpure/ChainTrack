"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Search,
  Camera,
  Layers,
  FileCheck2,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { QrScannerModal } from "@/components/QrScannerModal";

export default function HomePage() {
  const router = useRouter();
  const [productIdInput, setProductIdInput] = useState("");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (productIdInput.trim()) {
      router.push(`/verify/${encodeURIComponent(productIdInput.trim())}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-400 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Immutable Trust Layer for Modern Supply Chains</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Verify Product Provenance <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Directly on the Blockchain
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            ChainTrack links physical goods to immutable on-chain records with cryptographic data hashing, role-enforced custody handovers, and public QR verification.
          </p>

          {/* Product Verification Search Box */}
          <div className="max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-sm">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productIdInput}
                  onChange={(e) => setProductIdInput(e.target.value)}
                  placeholder="Enter Product ID (e.g. 1)"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-950/30"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  title="Scan with Camera"
                  className="flex items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
                >
                  <Camera className="w-5 h-5 text-emerald-400" />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 text-xs text-slate-500 flex items-center justify-center space-x-2">
            <span>Try sample IDs:</span>
            <button onClick={() => router.push("/verify/1")} className="font-mono text-emerald-400 hover:underline">#1</button>
            <span>•</span>
            <button onClick={() => router.push("/verify/2")} className="font-mono text-emerald-400 hover:underline">#2</button>
            <span>•</span>
            <button onClick={() => router.push("/verify/3")} className="font-mono text-emerald-400 hover:underline">#3</button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-12 border-t border-slate-900 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Cryptographic Tamper Detection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every product is anchored with a deterministic keccak256 hash computed across its canonical metadata. Any modified off-chain attribute immediately flags a Data Mismatch.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Two-Step Custody Handover</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transfers require affirmative two-step cryptographic sign-off. The current custodian dispatches the good, and only the authorized receiver can accept or reject custody.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Immutable Append-Only Audit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every status transition, checkpoint location update, and transfer acceptance appends an irreversible historical entry signed by the verified wallet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}
