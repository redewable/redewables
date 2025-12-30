import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet required' }, { status: 400 });
  }

  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const mint = new PublicKey(RDW_MINT);
    const owner = new PublicKey(wallet);

    const tokenAccount = await getAssociatedTokenAddress(mint, owner);
    
    try {
      const account = await getAccount(connection, tokenAccount);
      const balance = Number(account.amount) / 1e6;
      return NextResponse.json({ balance });
    } catch {
      // Account doesn't exist yet
      return NextResponse.json({ balance: 0 });
    }
  } catch (error: any) {
    console.error('Balance error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}