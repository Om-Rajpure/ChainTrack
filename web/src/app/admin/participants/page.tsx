"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import {
  Users,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Building,
  Mail,
  MapPin,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from "lucide-react";
import { parseContractError } from "@/lib/errors";

const ROLE_ENUM_VAL: Record<string, number> = {
  MANUFACTURER: 1,
  DISTRIBUTOR: 2,
  RETAILER: 3,
};

export default function AdminParticipantsPage() {
  const { role, getWriteContract, account } = useWallet();
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingAddr, setTogglingAddr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form fields
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState("MANUFACTURER");
  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [orgLocation, setOrgLocation] = useState("");

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/participants");
      if (res.ok) {
        const json = await res.json();
        setParticipants(json.data.participants || []);
      }
    } catch (err) {
      console.error("Failed to load participants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const normAddr = walletAddress.trim().toLowerCase();
    if (!normAddr.startsWith("0x") || normAddr.length !== 42) {
      setFeedback({ type: "error", message: "Please provide a valid 42-character Ethereum address (0x...)." });
      return;
    }

    setSubmitting(true);
    try {
      const contract = await getWriteContract();
      if (!contract) {
        throw new Error("Wallet not connected or contract not available.");
      }

      const roleNum = ROLE_ENUM_VAL[selectedRole];
      if (!roleNum) {
        throw new Error("Invalid role selected.");
      }

      // 1. Sign transaction on-chain: registerParticipant(address, role)
      const tx = await contract.registerParticipant(normAddr, roleNum);
      await tx.wait();

      // 2. Save participant profile metadata in off-chain database
      await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: normAddr,
          role: selectedRole,
          organizationName: orgName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          location: orgLocation.trim() || undefined,
        }),
      });

      setFeedback({
        type: "success",
        message: `Successfully registered participant ${normAddr.slice(0, 8)}... as ${selectedRole} on-chain!`,
      });

      // Reset form
      setWalletAddress("");
      setOrgName("");
      setContactEmail("");
      setOrgLocation("");

      await loadParticipants();
    } catch (err: any) {
      setFeedback({ type: "error", message: parseContractError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (p: any) => {
    setFeedback(null);
    setTogglingAddr(p.walletAddress);
    try {
      const contract = await getWriteContract();
      if (!contract) {
        throw new Error("Wallet not connected.");
      }

      const newActive = !p.isActive;

      // 1. Sign transaction on-chain: setParticipantActive(address, active)
      const tx = await contract.setParticipantActive(p.walletAddress, newActive);
      await tx.wait();

      // 2. Update off-chain database
      await fetch(`/api/participants/${p.walletAddress}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });

      setFeedback({
        type: "success",
        message: `Participant ${p.walletAddress.slice(0, 8)}... active status changed to ${newActive ? "ACTIVE" : "DEACTIVATED"}.`,
      });

      await loadParticipants();
    } catch (err: any) {
      setFeedback({ type: "error", message: parseContractError(err) });
    } finally {
      setTogglingAddr(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <Users className="w-7 h-7 text-red-400" />
            <span>Participant Access Control</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Admin portal to authorize participant roles and manage active statuses directly on the blockchain.
          </p>
        </div>

        <button
          onClick={loadParticipants}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Register Participant Form */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 h-fit">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Register Participant</span>
          </h2>

          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Wallet Address <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Role <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="MANUFACTURER">Manufacturer</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="RETAILER">Retailer</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Pharma Inc."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@acme.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Primary Location</label>
              <input
                type="text"
                value={orgLocation}
                onChange={(e) => setOrgLocation(e.target.value)}
                placeholder="e.g. Zurich, Switzerland"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition text-xs disabled:opacity-50 shadow-md shadow-emerald-950/40"
            >
              {submitting ? "Signing On-Chain Tx..." : "Register on Blockchain"}
            </button>
          </form>
        </div>

        {/* Participant List Table */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Registered Participants ({participants.length})</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading participant registry...</div>
          ) : participants.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No participants registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Wallet</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {participants.map((p) => {
                    const isToggling = togglingAddr === p.walletAddress;
                    return (
                      <tr key={p.id || p.walletAddress} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-mono text-slate-300" title={p.walletAddress}>
                          {p.walletAddress.slice(0, 6)}...{p.walletAddress.slice(-4)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                              p.role === "MANUFACTURER"
                                ? "bg-blue-950/60 text-blue-400 border-blue-800"
                                : p.role === "DISTRIBUTOR"
                                ? "bg-purple-950/60 text-purple-400 border-purple-800"
                                : "bg-indigo-950/60 text-indigo-400 border-indigo-800"
                            }`}
                          >
                            {p.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-white font-medium">
                          {p.organizationName || <span className="text-slate-500 italic">Unnamed</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center space-x-1 text-[11px] font-semibold ${
                              p.isActive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? "bg-emerald-400" : "bg-rose-400"}`} />
                            <span>{p.isActive ? "Active" : "Deactivated"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleToggleActive(p)}
                            disabled={isToggling}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition ${
                              p.isActive
                                ? "bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60"
                                : "bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60"
                            } disabled:opacity-50`}
                          >
                            {isToggling ? "Signing..." : p.isActive ? "Deactivate" : "Reactivate"}
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
      </div>
    </div>
  );
}
