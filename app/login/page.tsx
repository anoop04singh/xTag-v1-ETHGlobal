"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [nfcId, setNfcId] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nfcId.trim()) {
      login(nfcId);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-xl dark:bg-zinc-900">
        <div className="flex flex-col items-center space-y-2">
            <div className="h-12 w-12">
                <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-12 w-12 dark:hidden" />
                <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-12 w-12 hidden dark:block" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">Welcome to xTag</h1>
            <p className="text-sm text-center text-zinc-500 dark:text-zinc-400">
            Enter your NFC ID to sign in or create a new account.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nfcId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              NFC ID
            </label>
            <input
              id="nfcId"
              type="text"
              value={nfcId}
              onChange={(e) => setNfcId(e.target.value)}
              placeholder="e.g., my-nfc-band-id"
              className="w-full px-4 py-3 text-sm border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:bg-zinc-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-600 transition-colors"
          >
            {loading ? 'Authenticating...' : 'Continue'}
          </button>

          {error && (
            <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      </div>
      <footer className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        Made with ❤️ by{' '}
        <a
            href="https://github.com/anoop04singh"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline text-zinc-700 dark:text-zinc-300"
        >
            0xanoop
        </a>
      </footer>
    </div>
  );
}