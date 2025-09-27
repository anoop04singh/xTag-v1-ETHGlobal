"use client";

import { useState } from "react";
import axios from "axios";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import { Toaster } from "@/components/ui/sonner";

const baseURL = "http://localhost:4020";

const DataFetcher = () => {
  const [privateKey, setPrivateKey] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchData = async () => {
    if (!privateKey) {
      showError("Please enter a private key.");
      return;
    }

    setIsLoading(true);
    setData(null);
    setPaymentResponse(null);
    setError(null);

    try {
      const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as Hex);
      const api = withPaymentInterceptor(axios.create({ baseURL }), account);

      const response = await api.get("/get-data");

      setData(response.data);
      showSuccess("Data fetched successfully!");

      if (response.headers["x-payment-response"]) {
        const decodedPayment = decodeXPaymentResponse(
          response.headers["x-payment-response"]
        );
        setPaymentResponse(decodedPayment);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message || "An unknown error occurred.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Fetch Protected Data</CardTitle>
          <CardDescription>
            Enter your private key to fetch data from the server. This requires a small payment on the Polygon Amoy testnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="privateKey">Private Key</Label>
              <Input
                id="privateKey"
                type="password"
                placeholder="Enter your private key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Your private key is used to sign the payment transaction and is not stored.
              </p>
            </div>
            <Button onClick={handleFetchData} disabled={isLoading} className="w-full">
              {isLoading ? "Fetching..." : "Fetch Data"}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <h3 className="font-semibold text-destructive">Error</h3>
              <pre className="text-sm whitespace-pre-wrap break-all">
                <code>{error}</code>
              </pre>
            </div>
          )}

          {data && (
            <div className="mt-4 p-4 bg-secondary rounded-md">
              <h3 className="font-semibold">Received Data</h3>
              <pre className="text-sm whitespace-pre-wrap">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </div>
          )}

          {paymentResponse && (
            <div className="mt-4 p-4 bg-secondary rounded-md">
              <h3 className="font-semibold">Payment Response</h3>
              <pre className="text-sm whitespace-pre-wrap break-all">
                <code>{JSON.stringify(paymentResponse, null, 2)}</code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default DataFetcher;