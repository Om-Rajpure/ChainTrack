"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import {
  PackagePlus,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import { parseContractError } from "@/lib/errors";

export default function NewProductPage() {
  const router = useRouter();
  const { account, role, getWriteContract } = useWallet();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Pharmaceuticals");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [initialLocation, setInitialLocation] = useState("");
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([
    { key: "dosage", value: "500mg" },
    { key: "storageTemp", value: "2-8C" },
  ]);

  const [statusStep, setStatusStep] = useState<"idle" | "drafting" | "signing_tx" | "confirming" | "done">("idle");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const addAttribute = () => {
    setAttributes([...attributes, { key: "", value: "" }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index: number, field: "key" | "value", val: string) => {
    const updated = [...attributes];
    updated[index][field] = val;
    setAttributes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!account) {
      setFeedback({ type: "error", message: "Please connect your wallet first." });
      return;
    }

    if (role !== "MANUFACTURER") {
      setFeedback({
        type: "error",
        message: "Only registered Manufacturers can register new products.",
      });
      return;
    }

    try {
      // Step 1: Create draft in PostgreSQL & calculate canonical dataHash
      setStatusStep("drafting");
      const attrObj: Record<string, string> = {};
      attributes.forEach((a) => {
        if (a.key.trim()) {
          attrObj[a.key.trim()] = a.value.trim();
        }
      });

      const draftPayload = {
        name: name.trim(),
        category: category.trim(),
        batchNumber: batchNumber.trim(),
        manufacturingDate,
        description: description.trim() || undefined,
        manufacturerWallet: account.toLowerCase(),
        attributes: Object.keys(attrObj).length > 0 ? attrObj : undefined,
      };

      const draftRes = await fetch("/api/products/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload),
      });

      if (!draftRes.ok) {
        const draftErr = await draftRes.json();
        throw new Error(draftErr?.error?.message || "Failed to create product draft");
      }

      const draftJson = await draftRes.json();
      const { draftId, dataHash } = draftJson.data;

      // Step 2: Sign blockchain registration transaction in MetaMask
      setStatusStep("signing_tx");
      const contract = await getWriteContract();
      if (!contract) {
        throw new Error("Contract signer unavailable. Please check MetaMask.");
      }

      const tx = await contract.registerProduct(dataHash, initialLocation.trim() || "Manufacturing Plant");
      const receipt = await tx.wait();

      // Find ProductRegistered event in logs to extract chain productId
      let registeredProductId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "ProductRegistered") {
            registeredProductId = Number(parsed.args[0]);
            break;
          }
        } catch {
          // Non-matching log
        }
      }

      if (!registeredProductId) {
        throw new Error("Could not detect ProductRegistered event from transaction receipt.");
      }

      // Step 3: Confirm draft binding with on-chain product ID and txHash
      setStatusStep("confirming");
      const confirmRes = await fetch("/api/products/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          productId: registeredProductId,
          txHash: receipt.hash,
        }),
      });

      if (!confirmRes.ok) {
        const confirmErr = await confirmRes.json();
        throw new Error(confirmErr?.error?.message || "Draft confirmation failed");
      }

      setStatusStep("done");
      setFeedback({
        type: "success",
        message: `Product #${registeredProductId} registered and anchored on blockchain successfully!`,
      });

      setTimeout(() => {
        router.push(`/products/${registeredProductId}`);
      }, 1200);
    } catch (err: any) {
      setStatusStep("idle");
      setFeedback({ type: "error", message: parseContractError(err) });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/products"
        className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Catalog</span>
      </Link>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Register New Product</h1>
            <p className="text-xs text-slate-400">
              Anchors physical asset metadata with cryptographic Keccak-256 hash on the blockchain.
            </p>
          </div>
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

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amoxicillin 500mg"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Pharmaceuticals"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Batch / Lot Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-2026-09A"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Manufacturing Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-slate-300 font-medium mb-1.5">
                Initial Facility / Location <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={initialLocation}
                onChange={(e) => setInitialLocation(e.target.value)}
                placeholder="e.g. PharmaCorp Facility 3, Basel, Switzerland"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-slate-300 font-medium mb-1.5">
                Description / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Prescription medication details, storage instructions, etc."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Dynamic Attributes */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-300 font-medium">Custom Attributes</span>
              <button
                type="button"
                onClick={addAttribute}
                className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Attribute</span>
              </button>
            </div>

            <div className="space-y-2">
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Key (e.g. dosage)"
                    value={attr.key}
                    onChange={(e) => handleAttributeChange(idx, "key", e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 500mg)"
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(idx, "value", e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttribute(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              {statusStep === "drafting" && "Computing canonical hash..."}
              {statusStep === "signing_tx" && "Waiting for MetaMask signature..."}
              {statusStep === "confirming" && "Confirming on-chain registration..."}
              {statusStep === "done" && "Success!"}
            </div>

            <button
              type="submit"
              disabled={statusStep !== "idle"}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-3 rounded-xl transition disabled:opacity-50 shadow-lg shadow-emerald-950/40"
            >
              <Lock className="w-4 h-4" />
              <span>
                {statusStep === "idle"
                  ? "Register & Anchor On-Chain"
                  : "Processing Registration..."}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
