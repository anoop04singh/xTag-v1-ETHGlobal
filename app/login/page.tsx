"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Nfc, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [nfcId, setNfcId] = useState('');
  const { login, loading, error } = useAuth();
  const [scanError, setScanError] = useState<string | null>(null);
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'scanning' | 'scanned'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nfcId.trim()) {
      login(nfcId);
    }
  };

  const handleNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      setScanError("Web NFC is not supported on this browser. Please try Chrome on Android.");
      return;
    }

    setNfcStatus('scanning');
    setScanError(null);

    try {
      const reader = new NDEFReader();
      await reader.scan();
      
      reader.onreading = (event) => {
        try {
          const record = event.message.records[0];
          if (record.recordType === 'url') {
            const decoder = new TextDecoder();
            const urlString = decoder.decode(record.data);
            const url = new URL(urlString);
            const pk1 = url.searchParams.get('pk1');

            if (pk1) {
              console.log("NFC Scan successful, pk1 found:", pk1);
              setNfcStatus('scanned');
              login(pk1);
            } else {
              throw new Error("Could not find 'pk1' parameter in the NFC data.");
            }
          } else {
             throw new Error("NFC tag does not contain a URL.");
          }
        } catch (err: any) {
          setScanError(err.message || "Failed to read NFC data.");
          setNfcStatus('idle');
        }
      };

      reader.onerror = (event) => {
        console.error("NFC Reader Error:", event);
        setScanError("An error occurred while scanning. Please try again.");
        setNfcStatus('idle');
      };

    } catch (err: any) {
      setScanError(err.message || "Could not start NFC scanning.");
      setNfcStatus('idle');
    }
  };

  const isNfcAuthenticating = nfcStatus === 'scanned' && loading;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-xl dark:bg-zinc-900">
        <div className="flex flex-col items-center space-y-2">
            <div className="h-12 w-12">
                <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-12 w-12 dark:hidden" />
                <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-12 w-12 hidden dark:block" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">Welcome to xTag</h1>
            <p className="text-sm text-center text-zinc-500 dark:text-zinc-400">
              Tap your NFC device or enter its ID to begin.
            </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleNfcScan}
            disabled={loading || nfcStatus === 'scanning'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:bg-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-blue-600 transition-colors"
          >
            {isNfcAuthenticating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Authenticating...</>
            ) : nfcStatus === 'scanning' ? (
              <><Nfc className="h-5 w-5" /> Ready to Scan...</>
            ) : (
              <><Nfc className="h-5 w-5" /> Scan NFC Tag</>
            )}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
            <span className="flex-shrink mx-4 text-xs text-zinc-500 dark:text-zinc-400">OR</span>
            <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
          </div>

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nfcId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Enter NFC ID Manually
              </label>
              <input
                id="nfcId"
                type="text"
                value={nfcId}
                onChange={(e) => setNfcId(e.target.value)}
                placeholder="e.g., 04937F1B86..."
                className="w-full px-4 py-3 text-sm border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 px-4 py-3 font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:bg-zinc-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-600 transition-colors"
            >
              {loading && nfcStatus !== 'scanned' ? 'Authenticating...' : 'Continue'}
            </button>
          </form>

          {(error || scanError) && (
            <p className="text-sm text-center text-red-600 dark:text-red-400">{error || scanError}</p>
          )}
        </div>
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