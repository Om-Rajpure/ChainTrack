"use client";

import React from "react";
import {
  PackagePlus,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  BadgeDollarSign,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";

export interface TimelineEvent {
  eventType: string;
  timestamp: string | Date;
  actor: string;
  counterparty?: string | null;
  location?: string | null;
  note?: string | null;
  txHash?: string | null;
}

const eventStyles: Record<string, { title: string; icon: any; color: string; border: string; bg: string }> = {
  REGISTERED: {
    title: "Product Registered",
    icon: PackagePlus,
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-950/30",
  },
  TRANSFER_INITIATED: {
    title: "Transfer Dispatched / In Transit",
    icon: Truck,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-950/30",
  },
  TRANSFER_ACCEPTED: {
    title: "Custody Accepted & Received",
    icon: CheckCircle2,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/30",
  },
  TRANSFER_REJECTED: {
    title: "Transfer Rejected & Returned",
    icon: XCircle,
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-950/30",
  },
  LOCATION_UPDATE: {
    title: "Checkpoint / Location Update",
    icon: MapPin,
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/30",
  },
  SOLD: {
    title: "Product Sold to Consumer",
    icon: BadgeDollarSign,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/30",
  },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No recorded custody events found.
      </div>
    );
  }

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="relative pl-6 border-l-2 border-slate-800 space-y-8 my-4">
      {events.map((evt, idx) => {
        const style = eventStyles[evt.eventType] || {
          title: evt.eventType,
          icon: Clock,
          color: "text-slate-400",
          border: "border-slate-700",
          bg: "bg-slate-900",
        };
        const Icon = style.icon;

        return (
          <div key={idx} className="relative group">
            {/* Timeline bullet */}
            <div
              className={`absolute -left-[33px] top-1 w-8 h-8 rounded-full ${style.bg} border ${style.border} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}
            >
              <Icon className={`w-4 h-4 ${style.color}`} />
            </div>

            {/* Event Box */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5 hover:border-slate-700 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span>{style.title}</span>
                </h4>
                <div className="flex items-center space-x-1 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatDate(evt.timestamp)}</span>
                </div>
              </div>

              {/* Location & Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300 mt-2">
                {evt.location && (
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      Location: <strong>{evt.location}</strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-1.5 font-mono text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    Actor: <span className="text-slate-300">{shortenAddress(evt.actor)}</span>
                  </span>
                </div>

                {evt.counterparty && (
                  <div className="flex items-center space-x-1.5 font-mono text-amber-400/90 col-span-full">
                    <span>
                      Intended Receiver: <span className="underline">{shortenAddress(evt.counterparty)}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Note / Reason */}
              {evt.note && (
                <div className="mt-2.5 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs text-slate-300 italic">
                  &ldquo;{evt.note}&rdquo;
                </div>
              )}

              {/* Tx Hash */}
              {evt.txHash && (
                <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center space-x-1">
                  <span>Tx:</span>
                  <span className="truncate max-w-[240px] text-slate-400">{evt.txHash}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
