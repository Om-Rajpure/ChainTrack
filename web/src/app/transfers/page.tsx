"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Truck,
  MapPin,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { parseContractError } from "@/lib/errors";

export default function TransfersPage() {
  const { account, role, getWriteContract } = useWallet();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<{ type: "accept" | "reject"; product: any } | null>(null);
  const [submittingTx, setSubmittingTx] = useState(false);

  // Form Inputs
  const [acceptLocation, setAcceptLocation] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const loadTransfers = React.useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transfers/pending?address=${account}`);
      if (res.ok) {
        const json = await res.json();
        setTransfers(json.data.transfers || []);
      }
    } catch (err) {
      console.error("Failed to load pending transfers:", err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;
    setFeedback(null);
    setSubmittingTx(true);

    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("Wallet not connected");

      const productId = activeModal.product.chainProductId || activeModal.product.id;

      // Sign acceptTransfer on-chain
      const tx = await contract.acceptTransfer(
        productId,
        acceptLocation.trim() || "Receiving Dock"
      );
      await tx.wait();

      // Trigger indexer sync
      await fetch("/api/sync", { method: "POST" });

      setFeedback({
        type: "success",
        message: `Transfer for Product #${productId} accepted and custody acquired on-chain!`,
      });

      setActiveModal(null);
      setAcceptLocation("");
      await loadTransfers();
    } catch (err: any) {
      setFeedback({ type: "error", message: parseContractError(err) });
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;
    setFeedback(null);
    setSubmittingTx(true);

    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("Wallet not connected");

      const productId = activeModal.product.chainProductId || activeModal.product.id;

      // Sign rejectTransfer on-chain
      const tx = await contract.rejectTransfer(
        productId,
        rejectReason.trim() || "Rejected by receiver"
      );
      await tx.wait();

      // Trigger indexer sync
      await fetch("/api/sync", { method: "POST" });

      setFeedback({
        type: "success",
        message: `Transfer for Product #${productId} rejected and custody returned to sender!`,
      });

      setActiveModal(null);
      setRejectReason("");
      await loadTransfers();
    } catch (err: any) {
      setFeedback({ type: "error", message: parseContractError(err) });
    } finally {
      setSubmittingTx(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <ArrowLeftRight className="w-7 h-7 text-amber-400" />
            <span>Incoming Custody Transfers</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review, cryptographically accept, or reject incoming product handovers.
          </p>
        </div>

        <button
          onClick={loadTransfers}
          className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center space-x-2 border ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Transfers List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading incoming transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No pending incoming transfers designated to your wallet ({account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not connected"}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-semibold">Chain ID</th>
                  <th className="py-3.5 px-4 font-semibold">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold">Sender (Current Owner)</th>
                  <th className="py-3.5 px-4 font-semibold">Dispatch Details</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transfers.map((p) => {
                  const displayId = p.chainProductId || p.id;
                  const latestEvent = p.events?.[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        #{displayId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <Link href={`/products/${displayId}`} className="hover:text-emerald-400 transition">
                          {p.name}
                        </Link>
                        <span className="block text-[10px] text-slate-500 font-mono">
                          Batch: {p.batchNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300" title={p.currentOwner}>
                        {p.currentOwner ? `${p.currentOwner.slice(0, 6)}...${p.currentOwner.slice(-4)}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {latestEvent?.location && (
                          <div className="flex items-center space-x-1 text-xs">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{latestEvent.location}</span>
                          </div>
                        )}
                        {latestEvent?.note && (
                          <span className="text-[11px] text-slate-400 italic block">
                            &ldquo;{latestEvent.note}&rdquo;
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => setActiveModal({ type: "accept", product: p })}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => setActiveModal({ type: "reject", product: p })}
                          className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Accept Transfer */}
      {activeModal && activeModal.type === "accept" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Accept Custody Handover</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Accepting Product #{activeModal.product.chainProductId || activeModal.product.id} transfers ownership and advances lifecycle status.
            </p>

            <form onSubmit={handleAccept} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Receiving Facility / Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={acceptLocation}
                  onChange={(e) => setAcceptLocation(e.target.value)}
                  placeholder="e.g. Warehouse 4 Dock, Berlin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {submittingTx ? "Signing in MetaMask..." : "Confirm & Accept"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reject Transfer */}
      {activeModal && activeModal.type === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>Reject Handover Transfer</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Rejecting Product #{activeModal.product.chainProductId || activeModal.product.id} rolls back status to previous owner.
            </p>

            <form onSubmit={handleReject} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Rejection Reason / Incident Report <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Seal damaged during transit / Temperature excursion"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {submittingTx ? "Signing in MetaMask..." : "Confirm & Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
