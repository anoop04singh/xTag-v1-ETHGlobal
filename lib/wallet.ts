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

  // 2. Create the Biconomy Smart Account config
  const config: SmartAccountClientOptions = {
    signer,
    bundlerUrl: process.env.BICONOMY_BUNDLER_URL,
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL,
    chainId: polygonAmoy.id,
  };

  // Only add the paymaster API key if it exists in the .env file
  if (process.env.BICONOMY_PAYMASTER_API_KEY) {
    config.biconomyPaymasterApiKey = process.env.BICONOMY_PAYMASTER_API_KEY;
    console.log("[WALLET] Biconomy Paymaster API key found and included.");
  } else {
    console.log("[WALLET] Biconomy Paymaster API key not found. Gas fees will not be sponsored.");
  }

  console.log("[WALLET] Creating Biconomy smart account client with config:", {
    ...config,
    signer: 'Private key hidden',
    biconomyPaymasterApiKey: config.biconomyPaymasterApiKey ? 'Exists' : 'Not set'
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