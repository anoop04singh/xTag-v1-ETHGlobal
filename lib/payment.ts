import { createWalletClient, http, parseUnits, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { decrypt } from './encryption';
import { prisma } from './db';

const usdcContractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export async function executePayment(userId: string, paymentDetails: any) {
    console.log(`[PAYMENT LIB] Initiating payment for user ${userId}`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found for payment execution.');

    const privateKey = decrypt(user.encryptedSignerKey) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    const walletClient = createWalletClient({
        account,
        chain: polygonAmoy,
        transport: http(process.env.POLYGON_AMOY_RPC_URL!),
    }).extend(publicActions);
    
    console.log(`[PAYMENT LIB] Wallet client created for ${account.address}`);

    const usdcContractAddress = paymentDetails.asset as `0x${string}`;
    const amountInSmallestUnit = BigInt(paymentDetails.maxAmountRequired);
    const recipientAddress = paymentDetails.payTo as `0x${string}`;

    console.log(`[PAYMENT LIB] Preparing to transfer ${amountInSmallestUnit} of ${usdcContractAddress} to ${recipientAddress}`);

    try {
        const { request } = await walletClient.simulateContract({
            address: usdcContractAddress,
            abi: usdcContractABI,
            functionName: 'transfer',
            args: [recipientAddress, amountInSmallestUnit],
            account,
        });

        console.log('[PAYMENT LIB] Transaction simulated successfully. Sending transaction...');
        const txHash = await walletClient.writeContract(request);
        
        console.log(`[PAYMENT LIB] Transaction sent. Hash: ${txHash}. Waiting for confirmation...`);
        
        const receipt = await walletClient.waitForTransactionReceipt({ hash: txHash });

        if (receipt.status !== 'success') {
            throw new Error('On-chain transaction failed or was reverted.');
        }
        
        console.log(`[PAYMENT LIB] Transaction confirmed successfully.`);
        return { success: true, txHash };

    } catch (error) {
        console.error("[PAYMENT LIB] On-chain transaction failed:", error);
        if (error instanceof Error) {
            if (error.message.includes('insufficient funds')) {
                throw new Error("Transaction failed: Insufficient funds for payment or gas fees.");
            }
            if (error.message.includes('transaction reverted')) {
                throw new Error("Transaction failed: The smart contract reverted the transaction. This could be due to an issue with the token contract or allowances.");
            }
        }
        throw new Error("An unexpected error occurred during the on-chain transaction.");
    }
}