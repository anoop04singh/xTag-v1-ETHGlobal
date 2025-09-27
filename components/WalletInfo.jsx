"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Copy, ExternalLink, RefreshCw, Eye, EyeOff } from 'lucide-react';

export default function WalletInfo() {
  const { token } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);

  const fetchBalance = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (error) {
      console.error("Failed to fetch balance", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [token]);

  const handleCopyAddress = () => {
    if (balance?.walletAddress) {
      navigator.clipboard.writeText(balance.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyKey = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleShowPrivateKey = async () => {
    if (showPrivateKey) {
      setShowPrivateKey(false);
      return;
    }

    if (privateKey) {
      setShowPrivateKey(true);
      return;
    }

    setKeyLoading(true);
    try {
      const res = await fetch('/api/wallet/private-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrivateKey(data.privateKey);
        setShowPrivateKey(true);
      } else {
        console.error("Failed to fetch private key");
      }
    } catch (error) {
      console.error("Failed to fetch private key", error);
    } finally {
      setKeyLoading(false);
    }
  };

  return (
    <div className="px-3 py-3">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Wallet className="h-4 w-4" />
                    My Wallet
                </div>
                <button onClick={fetchBalance} disabled={loading} className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="space-y-2">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 animate-pulse"></div>
                </div>
            ) : balance ? (
                <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Address</span>
                        <div className="flex items-center gap-1 font-mono">
                            <span>{`${balance.walletAddress.substring(0, 6)}...${balance.walletAddress.substring(balance.walletAddress.length - 4)}`}</span>
                            <button onClick={handleCopyAddress} title="Copy Address">
                                <Copy className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                     <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">USDC</span>
                        <span className="font-medium">{balance.usdcBalance}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">MATIC</span>
                        <span className="font-medium">{balance.maticBalance}</span>
                    </div>
                    <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline pt-1">
                        Get Testnet Tokens <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            ) : (
                 <p className="text-xs text-zinc-500">Could not load balance.</p>
            )}

            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700/60">
                <button 
                    onClick={handleShowPrivateKey} 
                    disabled={keyLoading}
                    className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50 w-full text-left"
                >
                    {showPrivateKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {keyLoading ? 'Loading...' : showPrivateKey ? 'Hide Private Key' : 'Show Private Key'}
                </button>
                {showPrivateKey && privateKey && (
                    <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-500/30 rounded-md text-xs">
                        <p className="font-semibold text-yellow-800 dark:text-yellow-300">For Testing Only. Do not share.</p>
                        <div className="flex items-center gap-2 mt-1 font-mono text-yellow-900 dark:text-yellow-200 break-all">
                            <span>{privateKey}</span>
                            <button onClick={handleCopyKey} title="Copy Private Key">
                                <Copy className="h-3 w-3" />
                            </button>
                        </div>
                        {copiedKey && <span className="text-xs text-yellow-700 dark:text-yellow-200">Copied!</span>}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}