import { polygonAmoy } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export async function createWallet() {
  console.log("[WALLET] Starting standard EOA wallet creation...");
  
  // Generate a new private key and derive the account
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  const walletAddress = account.address;
  console.log(`[WALLET] Standard EOA wallet address generated: ${walletAddress}`);

  return {
    signerPrivateKey: privateKey,
    walletAddress: walletAddress,
  };
}