import { createSmartAccountClient } from "@biconomy/account";
import { polygonAmoy } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export async function createSmartAccount() {
  if (!process.env.BICONOMY_BUNDLER_URL) {
    throw new Error("BICONOMY_BUNDLER_URL is not set in .env file");
  }

  // 1. Generate a new private key for the signer
  const signerPrivateKey = generatePrivateKey();
  const signer = privateKeyToAccount(signerPrivateKey);

  // 2. Create the Biconomy Smart Account
  const biconomySmartAccount = await createSmartAccountClient({
    signer,
    bundlerUrl: process.env.BICONOMY_BUNDLER_URL,
    biconomyPaymasterApiKey: process.env.BICONOMY_PAYMASTER_API_KEY,
    chainId: polygonAmoy.id,
  });

  // 3. Get the smart account address
  const smartAccountAddress = await biconomySmartAccount.getAccountAddress();

  return {
    signerPrivateKey,
    smartAccountAddress,
  };
}