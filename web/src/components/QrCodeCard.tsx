"use client";

import React, { useState } from "react";
import { QrCode, Download, Copy, Check, ExternalLink } from "lucide-react";

export function QrCodeCard({
  productId,
  productName,
  serialNumber,
}: {
  productId: number;
  productName: string;
  serialNumber?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const verifyUrl = `${baseUrl}/verify/${productId}`;
  const qrApiUrl = `/api/products/${productId}/qr`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
      <div className="inline-flex p-3 rounded-2xl bg-white shadow-md mb-4 border border-slate-200">
        {/* Render QR code via server-generated PNG */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrApiUrl}
          alt={`QR Code for Product #${productId}`}
          className="w-48 h-48 object-contain"
          width={192}
          height={192}
        />
      </div>

      <h3 className="text-base font-bold text-white mb-0.5 truncate">{productName}</h3>
      <p className="text-xs text-slate-400 font-mono mb-4">
        Product ID: #{productId} {serialNumber ? `• SN: ${serialNumber}` : ""}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        <a
          href={qrApiUrl}
          download={`chaintrack-qr-${productId}.png`}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PNG</span>
        </a>

        <button
          onClick={copyToClipboard}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied Link!" : "Copy Link"}</span>
        </button>
      </div>
    </div>
  );
}
