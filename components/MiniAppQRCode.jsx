"use client";

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MiniAppQRCode() {
  // Your new Worldcoin Mini App ID
  const appId = "app_c1f2f99ac2a42ab5b32f426bafe579d3";

  // The URL that will be encoded into the QR code
  const miniAppUrl = `https://world.org/mini-app?app_id=${appId}`;

  return (
    <Card className="mt-8 w-full max-w-md">
      <CardHeader>
        <CardTitle>Test as a World Mini App</CardTitle>
        <CardDescription>
          Scan this QR code with your phone's camera to open this application inside the World App.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <QRCodeSVG value={miniAppUrl} size={192} />
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
          <p>
            To create your own Mini App, visit the{' '}
            <a
              href="https://developer.worldcoin.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Worldcoin Developer Portal
            </a>
            .
          </p>
          <p className="mt-2 font-mono bg-zinc-100 dark:bg-zinc-800 p-1 rounded break-all">
            {miniAppUrl}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}