"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function TestPaymentPage() {
  const { token, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentTest, setCurrentTest] = useState<string | null>(null);

  const handleTestPayment = async (path: string, endpointName: string) => {
    if (!token) {
      setError("You are not logged in.");
      return;
    }
    setLoading(true);
    setCurrentTest(endpointName);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/test-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'An unknown error occurred');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setCurrentTest(null);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading user...</div>;
  }

  const endpoints = [
    { name: 'Get Data', path: '/api/get-data' },
    { name: 'NFT Metadata', path: '/api/nft-metadata' },
    { name: 'Trading Signals', path: '/api/trading-signals' },
    { name: 'Documentation', path: '/api/documentation' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Test Paid API Requests</CardTitle>
          <CardDescription>
            Click a button to test the x402 payment flow for a specific resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {endpoints.map(endpoint => (
              <Button 
                key={endpoint.name}
                onClick={() => handleTestPayment(endpoint.path, endpoint.name)} 
                disabled={loading} 
                className="w-full"
              >
                {loading && currentTest === endpoint.name ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test {endpoint.name}
              </Button>
            ))}
          </div>

          {result && (
            <div className="p-4 mt-4 text-sm bg-green-100 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-500/20">
              <h3 className="font-bold text-green-800 dark:text-green-300">Success!</h3>
              <pre className="mt-2 text-xs text-green-700 whitespace-pre-wrap bg-white dark:bg-zinc-800 p-2 rounded dark:text-green-200 max-h-60 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-500/20">
              <h3 className="font-bold text-red-800 dark:text-red-300">Error</h3>
              <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap bg-white dark:bg-zinc-800 p-2 rounded dark:text-red-200">
                {error}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
      <Link href="/" className="mt-4 text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Back to Chat
      </Link>
    </div>
  );
}