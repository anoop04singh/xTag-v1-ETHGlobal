"use client";

export default function AboutPane() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center h-full justify-center">
        <div className="h-24 w-24 mb-6">
          <img src="/XtagLogoBK.png" alt="xTag Logo" className="h-24 w-24 dark:hidden" />
          <img src="/XtagLogoWh.png" alt="xTag Logo" className="h-24 w-24 hidden dark:block" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">About xTag</h1>
        <p className="text-zinc-600 dark:text-zinc-300 mb-4 max-w-2xl">
          xTag is an intelligent AI assistant designed to bridge the gap between natural language and complex blockchain operations. Our smart agent understands your requests and can interact with paid, on-chain resources by seamlessly handling micropayments on your behalf.
        </p>
        <p className="text-zinc-600 dark:text-zinc-300 max-w-2xl">
          From fetching NFT metadata to checking wallet balances and accessing premium trading signals, xTag simplifies the decentralized world. Just chat with the assistant, and let it handle the rest.
        </p>
      </div>
    </div>
  );
}