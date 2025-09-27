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

  const handleTestPayment = async () => {
    if (!token) {
      setError("You are not logged in.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/test-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(data.details) || 'An unknown error occurred');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading user...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Paid API Request</CardTitle>
          <CardDescription>
            Click the button to test the x402 payment flow for the "/get-data" resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTestPayment} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Processing...' : 'Run Test'}
          </Button>

          {result && (
            <div className="p-4 mt-4 text-sm bg-green-100 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-500/20">
              <h3 className="font-bold text-green-800 dark:text-green-300">Success!</h3>
              <pre className="mt-2 text-xs text-green-700 whitespace-pre-wrap bg-white dark:bg-zinc-800 p-2 rounded dark:text-green-200">
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