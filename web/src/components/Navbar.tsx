"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import {
  ShieldCheck,
  Package,
  PlusCircle,
  ArrowLeftRight,
  Users,
  LayoutDashboard,
  Wallet,
  LogOut,
  LogIn,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { account, role, isActive, isAuthenticated, connectWallet, signInWithEthereum, logout, isSigningIn } = useWallet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "ADMIN":
        return <span className="bg-red-950/60 text-red-400 border border-red-800 text-[11px] px-2 py-0.5 rounded-full font-semibold">Admin</span>;
      case "MANUFACTURER":
        return <span className="bg-blue-950/60 text-blue-400 border border-blue-800 text-[11px] px-2 py-0.5 rounded-full font-semibold">Manufacturer</span>;
      case "DISTRIBUTOR":
        return <span className="bg-purple-950/60 text-purple-400 border border-purple-800 text-[11px] px-2 py-0.5 rounded-full font-semibold">Distributor</span>;
      case "RETAILER":
        return <span className="bg-indigo-950/60 text-indigo-400 border border-indigo-800 text-[11px] px-2 py-0.5 rounded-full font-semibold">Retailer</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[11px] px-2 py-0.5 rounded-full">Public</span>;
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: isAuthenticated },
    { href: "/products", label: "Products", icon: Package, show: isAuthenticated },
    { href: "/products/new", label: "Register Product", icon: PlusCircle, show: isAuthenticated && role === "MANUFACTURER" },
    { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, show: isAuthenticated && (role === "DISTRIBUTOR" || role === "RETAILER") },
    { href: "/admin/participants", label: "Participants", icon: Users, show: isAuthenticated && role === "ADMIN" },
  ];

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-500 transition">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-emerald-400 transition">
                Chain<span className="text-emerald-400">Track</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center space-x-1 pl-6">
              {navLinks
                .filter((link) => link.show)
                .map((link) => {
                  const Icon = link.icon;
                  const isActiveLink = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        isActiveLink
                          ? "bg-slate-800 text-white border border-slate-700"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="hidden md:flex items-center space-x-3">
            {account ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5">
                  <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                  <span className="text-xs font-mono text-slate-300">{shortenAddress(account)}</span>
                  {getRoleBadge(role)}
                </div>

                {!isAuthenticated ? (
                  <button
                    onClick={signInWithEthereum}
                    disabled={isSigningIn}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isSigningIn ? "Signing In..." : "Sign In (SIWE)"}</span>
                  </button>
                ) : (
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition shadow-sm"
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          {navLinks
            .filter((link) => link.show)
            .map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

          <div className="pt-2 border-t border-slate-800 flex flex-col space-y-2">
            {account ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded">
                  <span className="text-xs font-mono text-slate-400">{shortenAddress(account)}</span>
                  {getRoleBadge(role)}
                </div>
                {!isAuthenticated ? (
                  <button
                    onClick={() => {
                      signInWithEthereum();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 bg-emerald-600 text-white rounded text-xs font-semibold"
                  >
                    Sign In (SIWE)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 bg-rose-950/60 text-rose-300 border border-rose-800 rounded text-xs font-semibold"
                  >
                    Sign Out
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  connectWallet();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-emerald-600 text-white rounded text-xs font-semibold"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
