"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import {
  Package,
  ArrowLeft,
  Truck,
  MapPin,
  BadgeDollarSign,
  QrCode,
  ShieldCheck,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { QrCodeCard } from "@/components/QrCodeCard";
import { parseContractError } from "@/lib/errors";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { account, role, getWriteContract } = useWallet();

  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<"transfer" | "location" | "sold" | null>(null);
  const [submittingTx, setSubmittingTx] = useState(false);

  // Modal Form States
  const [transferReceiver, setTransferReceiver] = useState("");
  const [transferLocation, setTransferLocation] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const [locUpdateLocation, setLocUpdateLocation] = useState("");
  const [locUpdateNote, setLocUpdateNote] = useState("");

  const [soldLocation, setSoldLocation] = useState("");

  const loadProduct = React.useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify/${productId}`);
      const json = await res.json();
      if (!res.ok && !json.data) {
        throw new Error(json.error?.message || "Failed to load product details");
      }
      setProductData(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmittingTx(true);
    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("Wallet not connected");

      const numId = parseInt(productId, 10);
      const toAddr = transferReceiver.trim().toLowerCase();

      // Initiate transfer on chain
      const tx = await contract.initiateTransfer(
        numId,
        toAddr,
        transferLocation.trim() || "Transit Hub",
        transferNote.trim() || "Transfer initiated"
      );
      await tx.wait();

      // Trigger indexer sync
      await fetch("/api/sync", { method: "POST" });

      setFeedback({
        type: "success",
        message: `Transfer dispatched on-chain to receiver ${toAddr.slice(0, 8)}...!`,
      });

      setActiveModal(null);
      setTransferReceiver("");
      setTransferLocation("");
      setTransferNote("");
      await loadProduct();
    } catch (err: any) {
      setFeedback({ type: "error", message: parseContractError(err) });
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleLocationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmittingTx(true);
    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("Wallet not connected");

      const numId = parseInt(productId, 10);

      const tx = await contract.addLocationUpdate(
        numId,
        locUpdateLocation.trim() || "Warehouse Checkpoint",
        locUpdateNote.trim() || "Routine inspection verified"
      );
      await tx.wait();

      await fetch("/api/sync", { method: "POST" });

      setFeedback({
        type: "success",
        message: "Location checkpoint appended to on-chain history successfully!",
      });

      setActiveModal(null);
      setLocUpdateLocation("");
      setLocUpdateNote("");
      await loadProduct();
    } catch (err: any) {
      setFeedback({ type: "error", message: parseContractError(err) });
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleMarkSold = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmittingTx(true);
    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("Wallet not connected");

      const numId = parseInt(productId, 10);

      const tx = await contract.markSold(
        numId,
        soldLocation.trim() || "Retail Store Counter"
      );
      await tx.wait();

      await fetch("/api/sync", { method: "POST" });

      setFeedback({
        type: "success",
        message: "Product marked as SOLD and lifecycle finalized on-chain!",
      });

      setActiveModal(null);
      setSoldLocation("");
      await loadProduct();
    } catch (err: any) {
      setFeedback({ type: "error", message: parseContractError(err) });
    } finally {
      setSubmittingTx(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-400">Loading product record...</span>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-rose-400 mb-4">{error || "Product not found"}</p>
        <Link href="/products" className="text-xs text-emerald-400 hover:underline">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const chainStatus = productData.chain?.status;
  const currentOwner = productData.chain?.currentOwner?.toLowerCase();
  const isCurrentOwner = account && currentOwner && account.toLowerCase() === currentOwner;

  // Lifecycle permissions
  const canTransfer = isCurrentOwner && (chainStatus === "CREATED" || chainStatus === "AT_DISTRIBUTOR");
  const canAddLocation = isCurrentOwner && chainStatus !== "IN_TRANSIT" && chainStatus !== "SOLD";
  const canMarkSold = isCurrentOwner && role === "RETAILER" && chainStatus === "AT_RETAILER";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/products"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>

        <Link
          href={`/verify/${productId}`}
          className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>View Public Verification Portal</span>
        </Link>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Product Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {productData.db?.name || `Product #${productData.productId}`}
                  </h1>
                  <StatusBadge status={chainStatus} />
                </div>
                <p className="text-xs text-slate-400">
                  Category: <strong className="text-slate-200">{productData.db?.category || "General"}</strong> • Batch: <span className="font-mono text-slate-300">{productData.db?.batchNumber || "—"}</span>
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-right">
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Chain Product ID</span>
                <span className="text-lg font-mono font-bold text-emerald-400">#{productData.productId}</span>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="pt-4 flex flex-wrap gap-2.5">
              {canTransfer && (
                <button
                  onClick={() => setActiveModal("transfer")}
                  className="inline-flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-amber-950/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Initiate Transfer</span>
                </button>
              )}

              {canAddLocation && (
                <button
                  onClick={() => setActiveModal("location")}
                  className="inline-flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-cyan-950/30"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Add Location Checkpoint</span>
                </button>
              )}

              {canMarkSold && (
                <button
                  onClick={() => setActiveModal("sold")}
                  className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-emerald-950/30"
                >
                  <BadgeDollarSign className="w-3.5 h-3.5" />
                  <span>Mark Sold to Consumer</span>
                </button>
              )}

              {!canTransfer && !canAddLocation && !canMarkSold && (
                <span className="text-xs text-slate-500 italic py-1">
                  {chainStatus === "SOLD"
                    ? "Product has reached terminal Sold state. No further transitions permitted."
                    : chainStatus === "IN_TRANSIT"
                    ? "Product is In Transit. Awaiting pending receiver acceptance."
                    : !isCurrentOwner
                    ? "Read-only view. Only the current product custodian can trigger handovers."
                    : "No pending transitions available for current status."}
                </span>
              )}
            </div>
          </div>

          {/* Specifications Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-xs space-y-4">
            <h2 className="text-sm font-bold text-white mb-2">Descriptive Metadata (PostgreSQL)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="block text-slate-500 mb-0.5">Serial Number</span>
                <span className="font-mono text-slate-300 font-semibold">{productData.db?.serialNumber || "—"}</span>
              </div>
              <div>
                <span className="block text-slate-500 mb-0.5">Manufacturing Date</span>
                <span className="font-mono text-slate-300">
                  {productData.db?.manufacturingDate ? new Date(productData.db.manufacturingDate).toISOString().slice(0, 10) : "—"}
                </span>
              </div>
              <div>
                <span className="block text-slate-500 mb-0.5">Manufacturer Wallet</span>
                <span className="font-mono text-slate-300 truncate block" title={productData.db?.manufacturerWallet}>
                  {productData.db?.manufacturerWallet ? `${productData.db.manufacturerWallet.slice(0, 6)}...${productData.db.manufacturerWallet.slice(-4)}` : "—"}
                </span>
              </div>
            </div>

            {productData.db?.description && (
              <div className="pt-2 border-t border-slate-800">
                <span className="block text-slate-500 mb-1">Description</span>
                <p className="text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  {productData.db.description}
                </p>
              </div>
            )}

            {productData.db?.attributes && Object.keys(productData.db.attributes).length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="block text-slate-500 mb-2">Custom Attributes</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(productData.db.attributes).map(([k, v]) => (
                    <div key={k} className="bg-slate-950/80 border border-slate-800 p-2 rounded-lg">
                      <span className="block text-slate-500 capitalize">{k}</span>
                      <span className="font-medium text-slate-200 truncate block">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QR Code & Chain Truth */}
        <div className="space-y-6">
          <QrCodeCard
            productId={productData.productId}
            productName={productData.db?.name || `Product #${productData.productId}`}
            serialNumber={productData.db?.serialNumber}
          />

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-white pb-2 border-b border-slate-800 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Immutable Chain State</span>
            </h3>

            <div>
              <span className="block text-slate-500 mb-0.5">Current Owner</span>
              <span className="font-mono text-emerald-400 bg-slate-950 p-2 rounded block border border-slate-800 truncate">
                {productData.chain?.currentOwner}
              </span>
            </div>

            {productData.chain?.pendingReceiver && (
              <div>
                <span className="block text-amber-500 mb-0.5">Pending Receiver</span>
                <span className="font-mono text-amber-300 bg-slate-950 p-2 rounded block border border-amber-900/50 truncate">
                  {productData.chain.pendingReceiver}
                </span>
              </div>
            )}

            <div>
              <span className="block text-slate-500 mb-0.5">Data Hash (keccak256)</span>
              <span className="font-mono text-[10px] text-slate-400 bg-slate-950 p-2 rounded block border border-slate-800 truncate" title={productData.chain?.dataHash}>
                {productData.chain?.dataHash}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custody History Timeline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Custody Journey Timeline</span>
        </h2>
        <Timeline events={productData.history || []} />
      </div>

      {/* Modal: Initiate Transfer */}
      {activeModal === "transfer" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Truck className="w-5 h-5 text-amber-400" />
              <span>Initiate Handover Transfer</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dispatches product custody to designated registered recipient.
            </p>

            <form onSubmit={handleInitiateTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Receiver Wallet Address (Distributor or Retailer) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={transferReceiver}
                  onChange={(e) => setTransferReceiver(e.target.value)}
                  placeholder="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Dispatch Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={transferLocation}
                  onChange={(e) => setTransferLocation(e.target.value)}
                  placeholder="e.g. Distribution Hub Alpha, Hamburg"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Transfer Note / Waybill (Optional)
                </label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Dispatched via refrigerated freight #TRK-882"
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
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {submittingTx ? "Signing in MetaMask..." : "Sign & Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Location Checkpoint Update */}
      {activeModal === "location" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span>Add Location Checkpoint</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Records an intermediate inspection or location checkpoint in on-chain history.
            </p>

            <form onSubmit={handleLocationUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Checkpoint Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={locUpdateLocation}
                  onChange={(e) => setLocUpdateLocation(e.target.value)}
                  placeholder="e.g. Customs Inspection Depot, Frankfurt"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Checkpoint Note / Sensor Data (Optional)
                </label>
                <input
                  type="text"
                  value={locUpdateNote}
                  onChange={(e) => setLocUpdateNote(e.target.value)}
                  placeholder="e.g. Cold storage verified at 4.2C"
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
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {submittingTx ? "Signing in MetaMask..." : "Append Checkpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mark Sold */}
      {activeModal === "sold" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <BadgeDollarSign className="w-5 h-5 text-emerald-400" />
              <span>Mark Product Sold to Consumer</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Marks final consumer purchase. This is a terminal state transition.
            </p>

            <form onSubmit={handleMarkSold} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Retail Store Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={soldLocation}
                  onChange={(e) => setSoldLocation(e.target.value)}
                  placeholder="e.g. MediStore Pharmacy #12, Berlin"
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
                  {submittingTx ? "Signing in MetaMask..." : "Confirm & Mark Sold"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
