"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const endpoints = [
  {
    name: "Get Data",
    command: 'run "get-data"',
    description: "Fetches a sample dataset. A great starting point to test the basic payment flow and data retrieval capabilities.",
  },
  {
    name: "NFT Metadata",
    command: 'run "nft-metadata" --contract_address <address> --token_id <id>',
    description: "Retrieves detailed metadata for a specific Non-Fungible Token (NFT) on the Polygon network. You must provide the contract address and token ID.",
  },
  {
    name: "Trading Signals",
    command: 'run "trading-signals"',
    description: "Provides the latest cryptocurrency trading signals, offering insights like buy/sell recommendations and market trends.",
  },
  {
    name: "Documentation",
    command: 'run "documentation"',
    description: "Access technical documentation and guides. Useful for developers looking for information on how to integrate with our services.",
  },
  {
    name: "Wallet Portfolio",
    command: 'run "wallet-balance"',
    description: "Fetches your ERC20 token portfolio on the Polygon network using your connected wallet address.",
  },
];

export default function ExplorePane() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Explore Endpoints</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Discover the paid resources available through the AI assistant. Use the provided commands in the chat to access them.
        </p>
        <div className="grid gap-6">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.name}>
              <CardHeader>
                <CardTitle>{endpoint.name}</CardTitle>
                <CardDescription>{endpoint.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">To use, type the following command in the chat:</p>
                <Badge variant="outline" className="mt-2 font-mono">
                  {endpoint.command}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}