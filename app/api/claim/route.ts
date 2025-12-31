import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
if (!process.env.RDW_TREASURY_SECRET_KEY) throw new Error('RDW_TREASURY_SECRET_KEY is not set');
if (!process.env.SOLANA_FEEPAYER_SECRET_KEY) throw new Error('SOLANA_FEEPAYER_SECRET_KEY is not set');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request: NextRequest) {
  try {
    const { wallet, amount } = await request.json();

    if (!wallet || !amount) {
      return NextResponse.json({ error: 'Missing wallet or amount' }, { status: 400 });
    }

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // Load treasury keypair from env
    const treasurySecret = JSON.parse(process.env.RDW_TREASURY_SECRET_KEY as string);
    const treasury = Keypair.fromSecretKey(new Uint8Array(treasurySecret));

    // Load fee payer keypair from env
    const payerSecret = JSON.parse(process.env.SOLANA_FEEPAYER_SECRET_KEY as string);
    const payer = Keypair.fromSecretKey(new Uint8Array(payerSecret));

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

    // If your RDW mint uses different decimals, change this.
    const rawAmount = Math.floor(Number(amount) * 1e6);

    const signature = await transfer(
      connection,
      payer,
      treasuryTokenAccount.address,
      recipientTokenAccount.address,
      treasury,
      rawAmount
    );

    // Record claim in database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (user) {
      await supabase.from('rewards').insert({
        user_id: user.id,
        amount: Number(amount),
        reason: 'Manual claim',
        claimed: true,
        claimed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      signature,
      amount: Number(amount),
      recipient: recipientTokenAccount.address.toString(),
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: error.message || 'Claim failed' }, { status: 500 });
  }
}