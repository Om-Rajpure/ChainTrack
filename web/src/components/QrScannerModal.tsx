"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export function QrScannerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const handleScanSuccess = React.useCallback(
    (decodedText: string) => {
      // Extract ID if full verification URL, otherwise parse numeric ID
      let targetId = decodedText.trim();
      if (targetId.includes("/verify/")) {
        const parts = targetId.split("/verify/");
        targetId = parts[parts.length - 1].split("?")[0].split("#")[0];
      }

      if (targetId) {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
        onClose();
        router.push(`/verify/${encodeURIComponent(targetId)}`);
      }
    },
    [onClose, router]
  );

  useEffect(() => {
    if (!isOpen) {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            html5QrCodeRef.current?.clear();
          });
      }
      setScannerStarted(false);
      setError(null);
      return;
    }

    const qrElementId = "qr-reader-container";
    const timer = setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(qrElementId);
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Check if URL or Product ID
            handleScanSuccess(decodedText);
          },
          () => {
            // Scan failure per frame (ignore normal misses)
          }
        );
        setScannerStarted(true);
      } catch (err: any) {
        console.warn("Camera start failed or permission denied:", err);
        setError("Camera permission denied or camera not available. You can enter the Product ID below.");
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear();
        });
      }
    };
  }, [isOpen, handleScanSuccess]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScanSuccess(manualInput);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Camera className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Scan Product QR Code</h3>
            <p className="text-xs text-slate-400">Position the QR code inside the camera box</p>
          </div>
        </div>

        {/* Camera stream box */}
        <div className="overflow-hidden rounded-xl bg-slate-950 border border-slate-800 relative min-h-[260px] flex items-center justify-center">
          <div id="qr-reader-container" className="w-full" />
          {!scannerStarted && !error && (
            <div className="text-xs text-slate-500 flex flex-col items-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Initializing Camera...</span>
            </div>
          )}
          {error && (
            <div className="p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          )}
        </div>

        {/* Manual Fallback */}
        <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-slate-800">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Or enter Product ID manually:
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="e.g. 1"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
