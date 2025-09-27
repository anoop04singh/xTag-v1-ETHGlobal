"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet } from 'lucide-react';

export default function WalletInfo() {
  const { user, token, logout } = useAuth();
  const [balances, setBalances] = useState({ matic: null, usdc: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!user || !token) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch balances');
        }
        const data = await res.json();
        setBalances(data);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [user, token]);

  if (!user) return null;

  const renderBalance = (value, currency) => {
    if (loading) {
      return <span className="h-4 w-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></span>;
    }
    if (error) {
      return <span className="text-xs text-red-500">Error</span>;
    }
    return (
      <>
        {value} <span className="text-zinc-400">{currency}</span>
      </>
    );
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-zinc-50 p-2 dark:bg-zinc-800/60">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={user.walletAddress}>
            {`${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`}
          </div>
          <a 
            href={`https://www.oklink.com/amoy/address/${user.walletAddress}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="truncate text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            View on Explorer
          </a>
        </div>
        <button onClick={logout} className="text-xs text-zinc-500 hover:underline dark:text-zinc-400 pr-1">
          Log out
        </button>
      </div>
      <div className="flex justify-around text-sm pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
        <div className="text-center font-medium">
          {renderBalance(balances.matic, 'MATIC')}
        </div>
        <div className="text-center font-medium">
          {renderBalance(balances.usdc, 'USDC')}
        </div>
      </div>
    </div>
  );
}