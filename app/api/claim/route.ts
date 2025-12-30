import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { wallet, amount } = await request.json();

    if (!wallet || !amount) {
      return NextResponse.json({ error: 'Missing wallet or amount' }, { status: 400 });
    }

    console.log(`💰 Claiming ${amount} $RDW for ${wallet}`);

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // Load treasury wallet (holds $RDW for distribution)
    const treasuryPath = path.join(process.env.HOME!, 'Desktop/redewable/treasury.json');
    const treasurySecret = JSON.parse(fs.readFileSync(treasuryPath, 'utf-8'));
    const treasury = Keypair.fromSecretKey(new Uint8Array(treasurySecret));

    // Load CLI wallet as fee payer
    const payerPath = path.join(process.env.HOME!, '.config/solana/id.json');
    const payerSecret = JSON.parse(fs.readFileSync(payerPath, 'utf-8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(payerSecret));

    const mint = new PublicKey(RDW_MINT);
    const recipientPubkey = new PublicKey(wallet);

    // Get or create recipient's token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipientPubkey
    );

    // Get treasury token account
    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      treasury.publicKey
    );

    // Transfer tokens (amount is in display units, convert to raw)
    const rawAmount = Math.floor(amount * 1e6);

    const signature = await transfer(
      connection,
      payer,
      treasuryTokenAccount.address,
      recipientTokenAccount.address,
      treasury,
      rawAmount
    );

    console.log('✅ Transfer complete:', signature);

    // Record claim in database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (user) {
      await supabase.from('rewards').insert({
        user_id: user.id,
        amount: amount,
        reason: 'Manual claim',
        claimed: true,
        claimed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      signature,
      amount,
      recipient: recipientTokenAccount.address.toString(),
    });

  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}