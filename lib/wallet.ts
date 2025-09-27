import { createSmartAccountClient } from "@biconomy/account"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export async function createWallet() {
  console.log("[WALLET] Starting Biconomy smart account creation...");

  const privateKey = generatePrivateKey();
  const signer = privateKeyToAccount(privateKey);

  const biconomySmartAccount = await createSmartAccountClient({
    signer,
    bundlerUrl: process.env.BICONOMY_BUNDLER_URL!,
  });

  const walletAddress = await biconomySmartAccount.getAccountAddress();
  console.log(`[WALLET] Biconomy smart account address generated: ${walletAddress}`);

  return {
    signerPrivateKey: privateKey,
    walletAddress: walletAddress,
  };
}