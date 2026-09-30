"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import {
  LayoutDashboard,
  Package,
  Truck,
  Building2,
  Store,
  BadgeDollarSign,
  PlusCircle,
  ArrowLeftRight,
  Users,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function DashboardPage() {
  const router = useRouter();
  const { account, role, isAuthenticated } = useWallet();
  const [stats, setStats] = useState<any | null>(null);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [pendingTransfersCount, setPendingTransfersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard stats
      const statsRes = await fetch("/api/dashboard/stats");
      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json.data);
      }

      // 2. Fetch recent products
      const prodRes = await fetch("/api/products?limit=5");
      if (prodRes.ok) {
        const json = await prodRes.json();
        setRecentProducts(json.data.products || []);
      }

      // 3. Fetch pending transfers if distributor or retailer
      if (account) {
        const transRes = await fetch(`/api/transfers/pending?address=${account}`);
        if (transRes.ok) {
          const json = await transRes.json();
          setPendingTransfersCount(json.data?.transfers?.length || 0);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSyncMessage(`Indexer synced: ${json.data?.message || "Success"}`);
        await loadData();
      } else {
        setSyncMessage(`Sync error: ${json.error?.message || "Failed"}`);
      }
    } catch (err: any) {
      setSyncMessage(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const statCards = [
    { label: "Total Products", value: stats?.totalProducts ?? 0, icon: Package, color: "text-blue-400", border: "border-blue-900/50" },
    { label: "In Transit", value: stats?.byStatus?.IN_TRANSIT ?? 0, icon: Truck, color: "text-amber-400", border: "border-amber-900/50" },
    { label: "At Distributor", value: stats?.byStatus?.AT_DISTRIBUTOR ?? 0, icon: Building2, color: "text-purple-400", border: "border-purple-900/50" },
    { label: "At Retailer", value: stats?.byStatus?.AT_RETAILER ?? 0, icon: Store, color: "text-indigo-400", border: "border-indigo-900/50" },
    { label: "Sold to Consumer", value: stats?.byStatus?.SOLD ?? 0, icon: BadgeDollarSign, color: "text-emerald-400", border: "border-emerald-900/50" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <LayoutDashboard className="w-7 h-7 text-emerald-400" />
            <span>Supply Chain Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time on-chain lifecycle metrics and pending actions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-emerald-400" : ""}`} />
            <span>{syncing ? "Syncing Chain..." : "Sync Indexer"}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="mb-6 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Role Action Alert Banner */}
      {role === "MANUFACTURER" && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-blue-950/50 to-slate-900 border border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Manufacturer Portal Active</h3>
            <p className="text-xs text-blue-200/80 mt-0.5">Register new physical products and anchor canonical metadata on the blockchain.</p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Product</span>
          </Link>
        </div>
      )}

      {(role === "DISTRIBUTOR" || role === "RETAILER") && pendingTransfersCount > 0 && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              {pendingTransfersCount} Incoming Transfer{pendingTransfersCount > 1 ? "s" : ""} Pending
            </h3>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Custody handovers awaiting your cryptographic acceptance or rejection.
            </p>
          </div>
          <Link
            href="/transfers"
            className="inline-flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Review Pending Transfers</span>
          </Link>
        </div>
      )}

      {role === "ADMIN" && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Administrator Access</h3>
            <p className="text-xs text-red-200/80 mt-0.5">Authorize participant roles and manage active statuses on-chain.</p>
          </div>
          <Link
            href="/admin/participants"
            className="inline-flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shrink-0"
          >
            <Users className="w-4 h-4" />
            <span>Participant Registry</span>
          </Link>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className={`bg-slate-900/60 border ${c.border} rounded-2xl p-4.5 hover:border-slate-700 transition`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">{c.label}</span>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className="text-2xl font-black text-white">{loading ? "-" : c.value}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Products Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Recent Products</span>
          </h2>
          <Link
            href="/products"
            className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading catalog...</div>
        ) : recentProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No products registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                      #{p.chainProductId || p.id}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">{p.name}</td>
                    <td className="py-3 px-3 text-slate-300">{p.category}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{p.batchNumber}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={p.currentStatus} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/products/${p.chainProductId || p.id}`}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center space-x-1"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
