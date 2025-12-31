import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

// IMPORTANT: Do NOT throw at module load time.
// Vercel/Next can evaluate API routes during build, and any throw will fail deployment.

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

    if (!SUPABASE_URL) {
      return NextResponse.json({ error: 'Server not configured: NEXT_PUBLIC_SUPABASE_URL missing' }, { status: 500 });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server not configured: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
    }
    if (!RDW_TREASURY_SECRET_KEY) {
      return NextResponse.json({ error: 'Server not configured: RDW_TREASURY_SECRET_KEY missing' }, { status: 500 });
    }
    if (!SOLANA_FEEPAYER_SECRET_KEY) {
      return NextResponse.json({ error: 'Server not configured: SOLANA_FEEPAYER_SECRET_KEY missing' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { wallet, amount } = await request.json();

    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // Load treasury keypair from env
    let treasury: Keypair;
    try {
      const treasurySecret = JSON.parse(RDW_TREASURY_SECRET_KEY);
      treasury = Keypair.fromSecretKey(new Uint8Array(treasurySecret));
    } catch (e) {
      return NextResponse.json({ error: 'Invalid RDW_TREASURY_SECRET_KEY format' }, { status: 500 });
    }

    // Load fee payer keypair from env
    let payer: Keypair;
    try {
      const payerSecret = JSON.parse(SOLANA_FEEPAYER_SECRET_KEY);
      payer = Keypair.fromSecretKey(new Uint8Array(payerSecret));
    } catch (e) {
      return NextResponse.json({ error: 'Invalid SOLANA_FEEPAYER_SECRET_KEY format' }, { status: 500 });
    }

    const mint = new PublicKey(RDW_MINT);
    const recipientPubkey = new PublicKey(wallet);

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipientPubkey
    );

    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      treasury.publicKey
    );

    // NOTE: Assumes 6 decimals. Adjust if your mint differs.
    const rawAmount = Math.floor(amt * 1e6);

    const signature = await transfer(
      connection,
      payer,
      treasuryTokenAccount.address,
      recipientTokenAccount.address,
      treasury,
      rawAmount
    );

    // Record claim in database (best-effort)
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (!userErr && user) {
      const { error: insertErr } = await supabase.from('rewards').insert({
        user_id: user.id,
        amount: amt,
        reason: 'Manual claim',
        claimed: true,
        claimed_at: new Date().toISOString(),
      });

      if (insertErr) {
        console.error('DB Error (rewards insert):', insertErr);
      }
    } else if (userErr) {
      console.error('DB Error (user lookup):', userErr);
    }

    return NextResponse.json({
      success: true,
      signature,
      amount: amt,
      recipient: recipientTokenAccount.address.toString(),
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: error.message || 'Claim failed' }, { status: 500 });
  }
}