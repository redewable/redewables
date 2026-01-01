import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

export async function GET(request: NextRequest) {
  // Next.js 15 best practice: searchParams are fine, 
  // but ensure we handle the null case strictly.
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    // 1. Use an environment variable for the RPC if available, otherwise fallback.
    // This prevents rate-limiting issues in production.
    const rpcEndpoint = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcEndpoint, 'confirmed');
    
    const mint = new PublicKey(RDW_MINT);
    const owner = new PublicKey(wallet);

    // 2. Derive the Associated Token Account (ATA)
    const tokenAccount = await getAssociatedTokenAddress(mint, owner);
    
    try {
      const account = await getAccount(connection, tokenAccount);
      // Assuming 6 decimals for the RDW token (1e6)
      const balance = Number(account.amount) / 1_000_000; 
      
      return NextResponse.json({ balance }, { status: 200 });
    } catch (e: any) {
      // If account doesn't exist, it usually means 0 balance
      return NextResponse.json({ balance: 0 }, { status: 200 });
    }
  } catch (error: any) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Solana balance' }, 
      { status: 500 }
    );
  }
}