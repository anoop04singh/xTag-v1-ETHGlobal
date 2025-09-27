"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageIcon } from "lucide-react";

const NftAttribute = ({ trait_type, value }) => (
  <div className="flex justify-between items-center text-xs p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md">
    <span className="text-zinc-500 dark:text-zinc-400">{trait_type}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

const NftCard = ({ nft }) => (
  <Card className="overflow-hidden">
    <CardHeader className="p-4">
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16 rounded-lg border">
          <AvatarImage src={nft.image_url} alt={nft.name || 'NFT Image'} />
          <AvatarFallback className="rounded-lg">
            <ImageIcon className="h-6 w-6 text-zinc-400" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-base leading-tight">{nft.name || "Unnamed NFT"}</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Token ID: {nft.token_id}</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      {nft.description && <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">{nft.description}</p>}
      {nft.attributes && Array.isArray(nft.attributes) && nft.attributes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Attributes</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nft.attributes.map((attr, index) => (
              <NftAttribute key={index} {...attr} />
            ))}
          </div>
        </div>
      )}
    </CardContent>
    <CardFooter className="bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
        Contract: <span className="font-mono">{nft.contract_address}</span>
      </p>
    </CardFooter>
  </Card>
);

export default function NftMetadataModal({ isOpen, onClose, data }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>NFT Metadata Results</DialogTitle>
          <DialogDescription>
            Found {data?.length || 0} NFT(s) matching your query.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
          <div className="space-y-4 py-4">
            {data && data.map((nft, index) => (
              <NftCard key={nft.token_id || index} nft={nft} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}