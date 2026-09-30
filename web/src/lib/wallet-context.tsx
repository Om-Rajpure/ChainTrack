"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import deploymentData from "./contract/deployment.json";
import contractAbi from "./contract/SupplyChain.abi.json";

interface WalletContextType {
  account: string | null;
  role: string;
  isActive: boolean;
  chainId: number | null;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  isSigningIn: boolean;
  isAuthenticated: boolean;
  profile: any | null;
  connectWallet: () => Promise<void>;
  signInWithEthereum: () => Promise<boolean>;
  logout: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  getWriteContract: () => Promise<ethers.Contract | null>;
  refreshSession: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  role: "NONE",
  isActive: false,
  chainId: null,
  isCorrectNetwork: true,
  isConnecting: false,
  isSigningIn: false,
  isAuthenticated: false,
  profile: null,
  connectWallet: async () => {},
  signInWithEthereum: async () => false,
  logout: async () => {},
  switchNetwork: async () => {},
  getWriteContract: async () => null,
  refreshSession: async () => {},
});

const EXPECTED_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337", 10);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<string>("NONE");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [profile, setProfile] = useState<any | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setIsAuthenticated(true);
          setRole(json.data.role || "NONE");
          setIsActive(Boolean(json.data.active));
          setProfile(json.data.profile || null);
          if (json.data.address) {
            setAccount(json.data.address.toLowerCase());
          }
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const checkNetwork = useCallback((currentChainId: number | bigint) => {
    const numId = Number(currentChainId);
    setChainId(numId);
    setIsCorrectNetwork(numId === EXPECTED_CHAIN_ID);
  }, []);

  // Check initial ethereum provider on mount
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;

      eth.request({ method: "eth_chainId" })
        .then((hexChainId: string) => checkNetwork(parseInt(hexChainId, 16)))
        .catch(() => {});

      eth.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0].toLowerCase());
          }
        })
        .catch(() => {});

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsAuthenticated(false);
          setRole("NONE");
        } else {
          setAccount(accounts[0].toLowerCase());
          refreshSession();
        }
      };

      const handleChainChanged = (hexChainId: string) => {
        checkNetwork(parseInt(hexChainId, 16));
      };

      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);

      return () => {
        if (eth.removeListener) {
          eth.removeListener("accountsChanged", handleAccountsChanged);
          eth.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [checkNetwork, refreshSession]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("MetaMask is not detected. Please install MetaMask to use ChainTrack.");
      return;
    }
    setIsConnecting(true);
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0].toLowerCase());
      }
      const hexChainId = await eth.request({ method: "eth_chainId" });
      checkNetwork(parseInt(hexChainId, 16));
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;
    const hexChainId = "0x" + EXPECTED_CHAIN_ID.toString(16);

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      // Chain not added to MetaMask: add it
      if (switchError.code === 4902) {
        try {
          if (EXPECTED_CHAIN_ID === 31337) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: hexChainId,
                  chainName: "Hardhat Local",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["http://127.0.0.1:8545"],
                },
              ],
            });
          }
        } catch (addError) {
          console.error("Failed to add network:", addError);
        }
      }
    }
  };

  const signInWithEthereum = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("MetaMask is required to sign in.");
      return false;
    }

    setIsSigningIn(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const currentAddress = (await signer.getAddress()).toLowerCase();
      setAccount(currentAddress);

      // 1. Fetch single-use nonce from server
      const nonceRes = await fetch(`/api/auth/nonce?address=${currentAddress}`);
      if (!nonceRes.ok) {
        throw new Error("Failed to obtain authentication nonce from server");
      }
      const nonceData = await nonceRes.json();
      const nonce = nonceData.data.nonce;

      // 2. Request user signature in MetaMask
      const message = `Sign in with Ethereum to ChainTrack Supply Chain Tracker\nNonce: ${nonce}`;
      const signature = await signer.signMessage(message);

      // 3. Verify signature with server and obtain session cookie
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: currentAddress,
          signature,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json();
        throw new Error(errJson?.error?.message || "Authentication verification failed");
      }

      const verifyData = await verifyRes.json();
      setIsAuthenticated(true);
      setRole(verifyData.data.role || "NONE");
      setIsActive(Boolean(verifyData.data.active));

      await refreshSession();
      return true;
    } catch (err: any) {
      console.error("Sign-in error:", err);
      alert(err.message || "Failed to complete Sign-In with Ethereum");
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network failure
    } finally {
      setIsAuthenticated(false);
      setRole("NONE");
      setIsActive(false);
      setProfile(null);
    }
  };

  const getWriteContract = async (): Promise<ethers.Contract | null> => {
    if (typeof window === "undefined" || !(window as any).ethereum) return null;
    const contractAddress =
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || (deploymentData as any).address || (deploymentData as any).contractAddress;
    if (!contractAddress) return null;

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, contractAbi, signer);
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        role,
        isActive,
        chainId,
        isCorrectNetwork,
        isConnecting,
        isSigningIn,
        isAuthenticated,
        profile,
        connectWallet,
        signInWithEthereum,
        logout,
        switchNetwork,
        getWriteContract,
        refreshSession,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
