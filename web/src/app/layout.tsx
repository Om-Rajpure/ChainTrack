import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet-context";
import { Navbar } from "@/components/Navbar";
import { NetworkBanner } from "@/components/NetworkBanner";

export const metadata: Metadata = {
  title: "ChainTrack — Blockchain Supply Chain Tracker",
  description: "Authentic, tamper-evident decentralized supply chain tracking system powered by Solidity smart contracts and Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-slate-950 text-slate-100">
      <body className="antialiased min-h-screen flex flex-col font-sans bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
        <WalletProvider>
          <NetworkBanner />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>ChainTrack Supply Chain Tracker • Built with Solidity, Hardhat, Next.js & PostgreSQL</p>
              <p className="font-mono text-[11px] text-slate-600">Chain ID 31337 (Local) / 11155111 (Sepolia)</p>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
