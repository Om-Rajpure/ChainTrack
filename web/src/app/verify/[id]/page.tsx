"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Package,
  Calendar,
  Layers,
  MapPin,
  Clock,
  ExternalLink,
  QrCode,
  ArrowLeft,
  RefreshCw,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { QrCodeCard } from "@/components/QrCodeCard";

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchVerification = React.useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify/${productId}`);
      const json = await res.json();
      if (!res.ok && !json.data) {
        throw new Error(json.error?.message || "Failed to verify product");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load verification record");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white mb-1">Verifying On Blockchain...</h2>
        <p className="text-xs text-slate-400">Querying smart contract and validating cryptographic hash</p>
      </div>
    );
  }

  if (error || !data || data.status === "NOT_FOUND") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search</span>
        </Link>

        <div className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
          <p className="text-sm text-rose-300 max-w-md mx-auto mb-6">
            Product #{productId} does not exist on the ChainTrack smart contract. This item is unverified and has no authentic record on the blockchain.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verify Another Product</span>
          </Link>
        </div>
      </div>
    );
  }

  const isAuthentic = data.status === "AUTHENTIC";
  const isMismatch = data.status === "DATA_MISMATCH";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button & Action Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search</span>
        </Link>

        <button
          onClick={() => setShowQrModal(!showQrModal)}
          className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>{showQrModal ? "Hide QR" : "Show QR Code"}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-8 mb-8 border shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${
          isAuthentic
            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-100"
            : "bg-amber-950/40 border-amber-500/50 text-amber-100"
        }`}
      >
        <div className="flex items-start space-x-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              isAuthentic
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}
          >
            {isAuthentic ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isAuthentic ? "Authentic Verified Product" : "Tamper Detected (Data Mismatch)"}
              </h2>
              <StatusBadge status={data.chain?.status} size="sm" />
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAuthentic
                ? "This product is registered on the blockchain. Cryptographic hash matches off-chain metadata identically."
                : "Warning: The descriptive metadata in the off-chain database does not match the original hash recorded on the blockchain at creation."}
            </p>
          </div>
        </div>

        <div className="shrink-0 bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-right">
          <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Chain Product ID</span>
          <span className="text-xl font-black font-mono text-emerald-400">#{data.productId}</span>
        </div>
      </div>

      {/* QR Modal Card if toggled */}
      {showQrModal && (
        <div className="mb-8 max-w-sm mx-auto">
          <QrCodeCard
            productId={data.productId}
            productName={data.db?.name || `Product #${data.productId}`}
            serialNumber={data.db?.serialNumber}
          />
        </div>
      )}

      {/* Grid: Product Info & Blockchain Trust Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Descriptive details (PostgreSQL) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Product Specifications</span>
            </h3>
            {data.db?.serialNumber && (
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                SN: {data.db.serialNumber}
              </span>
            )}
          </div>

          {data.db ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="block text-xs text-slate-400">Product Name</span>
                  <span className="font-semibold text-white">{data.db.name}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Category</span>
                  <span className="font-semibold text-slate-200">{data.db.category}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Batch Number</span>
                  <span className="font-mono text-slate-200">{data.db.batchNumber}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Manufacturing Date</span>
                  <span className="text-slate-200 font-mono">
                    {data.db.manufacturingDate ? new Date(data.db.manufacturingDate).toISOString().slice(0, 10) : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Manufacturer Wallet</span>
                  <span className="font-mono text-xs text-slate-300" title={data.db.manufacturerWallet}>
                    {shortenAddress(data.db.manufacturerWallet)}
                  </span>
                </div>
              </div>

              {data.db.description && (
                <div className="pt-3 border-t border-slate-800/80">
                  <span className="block text-xs text-slate-400 mb-1">Description</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    {data.db.description}
                  </p>
                </div>
              )}

              {/* Dynamic Attributes */}
              {data.db.attributes && Object.keys(data.db.attributes).length > 0 && (
                <div className="pt-3 border-t border-slate-800/80">
                  <span className="block text-xs text-slate-400 mb-2">Custom Attributes</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(data.db.attributes).map(([key, value]) => (
                      <div key={key} className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg text-xs">
                        <span className="block text-slate-500 capitalize">{key}</span>
                        <span className="font-medium text-slate-200 truncate block">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Off-chain descriptive specifications unavailable. Blockchain immutable trust record remains fully verifiable.
            </p>
          )}
        </div>

        {/* Blockchain Trust & Cryptographic Anchors */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-4 mb-4 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Blockchain Trust Proof</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="block text-slate-400 text-[11px] mb-0.5">Current Custodian</span>
                <span className="font-mono text-emerald-400 bg-slate-950 p-2 rounded block border border-slate-800 truncate" title={data.chain?.currentOwner}>
                  {data.chain?.currentOwner}
                </span>
              </div>

              {data.chain?.pendingReceiver && (
                <div>
                  <span className="block text-amber-400 text-[11px] mb-0.5">Pending Receiver</span>
                  <span className="font-mono text-amber-300 bg-slate-950 p-2 rounded block border border-amber-900/50 truncate" title={data.chain.pendingReceiver}>
                    {data.chain.pendingReceiver}
                  </span>
                </div>
              )}

              <div>
                <span className="block text-slate-400 text-[11px] mb-0.5">On-Chain Data Hash</span>
                <span className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded block border border-slate-800 truncate" title={data.chain?.dataHash}>
                  {data.chain?.dataHash}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 text-[11px] mb-0.5">Recomputed Off-Chain Hash</span>
                <span className={`font-mono text-[11px] p-2 rounded block border truncate ${
                  isAuthentic ? "bg-slate-950 text-emerald-400 border-slate-800" : "bg-rose-950/40 text-rose-300 border-rose-800"
                }`} title={data.computedHash}>
                  {data.computedHash || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total Lifecycle Checkpoints:</span>
            <span className="font-bold text-white">{data.history?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Custody Journey Timeline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Custody & Checkpoint Timeline (On-Chain History)</span>
        </h3>
        <Timeline events={data.history || []} />
      </div>
    </div>
  );
}
