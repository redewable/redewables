import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : null;
}

export async function POST(request: NextRequest) {
  try {
    const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const RDW_TREASURY_SECRET_KEY = getEnv('RDW_TREASURY_SECRET_KEY');
    const SOLANA_FEEPAYER_SECRET_KEY = getEnv('SOLANA_FEEPAYER_SECRET_KEY');

    if (!SUPABASE_URL) return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL missing' }, { status: 500 });
    if (!SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
    if (!RDW_TREASURY_SECRET_KEY) return NextResponse.json({ error: 'RDW_TREASURY_SECRET_KEY missing' }, { status: 500 });
    if (!SOLANA_FEEPAYER_SECRET_KEY) return NextResponse.json({ error: 'SOLANA_FEEPAYER_SECRET_KEY missing' }, { status: 500 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { wallet, amount } = await request.json();
    if (!wallet || typeof wallet !== 'string') return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    const treasurySecret = JSON.parse(RDW_TREASURY_SECRET_KEY);
    const treasury = Keypair.fromSecretKey(new Uint8Array(treasurySecret));

    const payerSecret = JSON.parse(SOLANA_FEEPAYER_SECRET_KEY);
    const payer = Keypair.fromSecretKey(new Uint8Array(payerSecret));

    const mint = new PublicKey(RDW_MINT);
    const recipientPubkey = new PublicKey(wallet);

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipientPubkey);
    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, treasury.publicKey);

    const rawAmount = Math.floor(amt * 1e6); // assumes 6 decimals
    const signature = await transfer(
      connection,
      payer,
      treasuryTokenAccount.address,
      recipientTokenAccount.address,
      treasury,
      rawAmount
    );

    const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet).single();
    if (user) {
      await supabase.from('rewards').insert({
        user_id: user.id,
        amount: amt,
        reason: 'Manual claim',
        claimed: true,
        claimed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, signature, amount: amt, recipient: recipientTokenAccount.address.toString() });
  } catch (err: any) {
    console.error('Claim error:', err);
    return NextResponse.json({ error: err.message || 'Claim failed' }, { status: 500 });
  }
}
