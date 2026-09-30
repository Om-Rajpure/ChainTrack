import React from "react";

export type ProductStatus =
  | "CREATED"
  | "IN_TRANSIT"
  | "AT_DISTRIBUTOR"
  | "AT_RETAILER"
  | "SOLD"
  | string;

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  CREATED: {
    label: "Created",
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    border: "border-blue-800/60",
    dot: "bg-blue-400",
  },
  IN_TRANSIT: {
    label: "In Transit",
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    border: "border-amber-800/60",
    dot: "bg-amber-400 animate-pulse",
  },
  AT_DISTRIBUTOR: {
    label: "At Distributor",
    bg: "bg-purple-950/40",
    text: "text-purple-300",
    border: "border-purple-800/60",
    dot: "bg-purple-400",
  },
  AT_RETAILER: {
    label: "At Retailer",
    bg: "bg-indigo-950/40",
    text: "text-indigo-300",
    border: "border-indigo-800/60",
    dot: "bg-indigo-400",
  },
  SOLD: {
    label: "Sold / Consumed",
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-800/60",
    dot: "bg-emerald-400",
  },
};

export function StatusBadge({ status, size = "md" }: { status: ProductStatus; size?: "sm" | "md" | "lg" }) {
  const normStatus = (status || "").toUpperCase();
  const config = statusConfig[normStatus] || {
    label: normStatus || "Unknown",
    bg: "bg-slate-800",
    text: "text-slate-300",
    border: "border-slate-700",
    dot: "bg-slate-400",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size];

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}
