import { NextResponse, NextRequest } from 'next/server';
import { createPublicClient, http, formatUnits, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { getCurrentUser } from '@/lib/currentUser';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

const USDC_CONTRACT_ADDRESS = '0x41e94eb019c0762f9bfcf9fb1e58725bf52e90c9';
const USDC_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
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

    const walletAddress = getAddress(user.walletAddress);

    const maticBalanceBigInt = await publicClient.getBalance({ address: walletAddress });
    const maticBalance = formatUnits(maticBalanceBigInt, 18);

    const usdcBalanceBigInt = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });
    
    const usdcDecimals = await publicClient.readContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'decimals',
    });

    const usdcBalance = formatUnits(usdcBalanceBigInt, usdcDecimals);

    return NextResponse.json({
      matic: parseFloat(maticBalance).toFixed(4),
      usdc: parseFloat(usdcBalance).toFixed(2),
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet balance' }, { status: 500 });
  }
}