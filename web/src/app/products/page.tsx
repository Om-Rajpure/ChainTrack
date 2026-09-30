"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import {
  Package,
  Search,
  PlusCircle,
  Filter,
  ArrowRight,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function ProductsPage() {
  const { role, account } = useWallet();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const loadProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/products?limit=50";
      if (selectedStatus !== "ALL") {
        url += `&status=${selectedStatus}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data.products || []);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const statuses = ["ALL", "CREATED", "IN_TRANSIT", "AT_DISTRIBUTOR", "AT_RETAILER", "SOLD"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <Package className="w-7 h-7 text-emerald-400" />
            <span>Product Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse tracked physical assets across all supply chain checkpoints.
          </p>
        </div>

        {role === "MANUFACTURER" && (
          <Link
            href="/products/new"
            className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-950/40 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Product</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Status Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-2 md:pb-0">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedStatus === st
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {st === "ALL" ? "All Statuses" : st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, batch..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading catalog...</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No matching products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-semibold">Chain ID</th>
                  <th className="py-3.5 px-4 font-semibold">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Batch Number</th>
                  <th className="py-3.5 px-4 font-semibold">Current Custodian</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => {
                  const displayId = p.chainProductId || p.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        #{displayId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <Link href={`/products/${displayId}`} className="hover:text-emerald-400 transition">
                          {p.name}
                        </Link>
                        {p.serialNumber && (
                          <span className="block text-[10px] text-slate-500 font-mono">
                            SN: {p.serialNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{p.category}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{p.batchNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400" title={p.currentOwner}>
                        {p.currentOwner ? `${p.currentOwner.slice(0, 6)}...${p.currentOwner.slice(-4)}` : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.currentStatus} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          href={`/products/${displayId}`}
                          className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
