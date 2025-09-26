"use client";

import { useState } from 'react';

export default function NfcTestClient() {
  const [nfcId, setNfcId] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!nfcId) {
      setError('Please enter an NFC ID.');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/auth/nfc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nfcId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-center">NFC Auth Test Client</h1>
        <p className="text-sm text-center text-zinc-500 dark:text-zinc-400">
          Simulate scanning an NFC band by entering a unique ID below.
        </p>
        
        <div className="space-y-2">
          <label htmlFor="nfcId" className="text-sm font-medium">
            NFC ID
          </label>
          <input
            id="nfcId"
            type="text"
            value={nfcId}
            onChange={(e) => setNfcId(e.target.value)}
            placeholder="e.g., 04-AB-CD-EF-12-34-56"
            className="w-full px-3 py-2 border rounded-md bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full px-4 py-2 font-semibold text-white bg-zinc-900 rounded-md hover:bg-zinc-800 disabled:bg-zinc-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-600"
        >
          {loading ? 'Scanning...' : 'Simulate Scan'}
        </button>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md dark:bg-red-900/20 dark:text-red-400 dark:border-red-500/30">
            <strong>Error:</strong> {error}
          </div>
        )}

        {response && (
          <div className="p-4 mt-4 space-y-2 bg-zinc-100 rounded-md dark:bg-zinc-800">
            <h2 className="font-semibold">Server Response:</h2>
            <pre className="p-2 text-xs text-left bg-zinc-200 dark:bg-zinc-700 rounded-md overflow-x-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
            {response.isNewUser && (
                <p className="text-xs text-green-600 dark:text-green-400">
                    Success! A new user and smart wallet were created. Try scanning the same ID again to test the login flow.
                </p>
            )}
            {!response.isNewUser && (
                 <p className="text-xs text-blue-600 dark:text-blue-400">
                    Success! An existing user was found. A new session token has been issued.
                </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}