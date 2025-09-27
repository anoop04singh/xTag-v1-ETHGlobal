import { NextResponse, NextRequest } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { getCurrentUser } from '@/lib/currentUser';

const usdcContractABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.POLYGON_AMOY_RPC_URL),
    });

    const smartAccountAddress = user.smartAccountAddress as `0x${string}`;
    const usdcContractAddress = process.env.USDC_CONTRACT_ADDRESS as `0x${string}`;

    if (!usdcContractAddress) {
        throw new Error("USDC_CONTRACT_ADDRESS is not set in the environment variables.");
    }

    // Fetch MATIC balance
    const maticBalanceBigInt = await publicClient.getBalance({ address: smartAccountAddress });
    const maticBalance = formatUnits(maticBalanceBigInt, 18);

    // Fetch USDC balance
    const usdcBalanceBigInt = await publicClient.readContract({
      address: usdcContractAddress,
      abi: usdcContractABI,
      functionName: 'balanceOf',
      args: [smartAccountAddress],
    });
    
    const usdcDecimals = await publicClient.readContract({
        address: usdcContractAddress,
        abi: usdcContractABI,
        functionName: 'decimals',
    });

    const usdcBalance = formatUnits(usdcBalanceBigInt, usdcDecimals);

    return NextResponse.json({
      smartAccountAddress,
      maticBalance: parseFloat(maticBalance).toFixed(4),
      usdcBalance: parseFloat(usdcBalance).toFixed(2),
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}