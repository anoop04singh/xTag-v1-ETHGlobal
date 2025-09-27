"use client";

import DataFetcher from '@/components/DataFetcher';
import Link from 'next/link';

export default function TestPaymentPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <DataFetcher />
      <Link href="/" className="mt-4 text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Back to Chat
      </Link>
    </div>
  );
}