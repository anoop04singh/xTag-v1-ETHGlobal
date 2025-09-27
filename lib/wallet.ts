import { createSmartAccountClient, type SmartAccountClientOptions } from "@biconomy/account";
import { polygonAmoy } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export async function createSmartAccount() {
  console.log("[WALLET] Starting smart account creation...");
  if (!process.env.BICONOMY_BUNDLER_URL) {
    throw new Error("BICONOMY_BUNDLER_URL is not set in .env file");
  }
  if (!process.env.POLYGON_AMOY_RPC_URL) {
    throw new Error("POLYGON_AMOY_RPC_URL is not set in .env file");
  }

  // 1. Generate a new private key for the signer
  const signerPrivateKey = generatePrivateKey();
  const signer = privateKeyToAccount(signerPrivateKey);
  console.log("[WALLET] New signer generated.");

  // 2. Create the Biconomy Smart Account config without the Paymaster
  const config: SmartAccountClientOptions = {
    signer,
    bundlerUrl: process.env.BICONOMY_BUNDLER_URL,
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL,
    chainId: polygonAmoy.id,
  };
  console.log("[WALLET] Biconomy Paymaster is disabled. Gas fees will be paid by the smart wallet.");

  console.log("[WALLET] Creating Biconomy smart account client with config:", {
    ...config,
    signer: 'Private key hidden',
  });

  const biconomySmartAccount = await createSmartAccountClient(config);

  // 3. Get the smart account address
  const smartAccountAddress = await biconomySmartAccount.getAccountAddress();
  console.log(`[WALLET] Smart account address generated: ${smartAccountAddress}`);

  return {
    signerPrivateKey,
    smartAccountAddress,
  };
}