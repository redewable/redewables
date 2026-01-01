import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

export async function POST(request: NextRequest) {
  try {
    // 1. Get Env Vars inside the handler to prevent build crashes
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RDW_TREASURY_SECRET_KEY = process.env.RDW_TREASURY_SECRET_KEY;
    const SOLANA_FEEPAYER_SECRET_KEY = process.env.SOLANA_FEEPAYER_SECRET_KEY;
    const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RDW_TREASURY_SECRET_KEY || !SOLANA_FEEPAYER_SECRET_KEY) {
      console.error('Missing critical environment variables for claim');
      return NextResponse.json({ error: 'Server configuration incomplete' }, { status: 500 });
    }

    // 2. Initialize Supabase Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Request Validation
    const body = await request.json();
    const { wallet, amount } = body;
    
    if (!wallet || typeof wallet !== 'string') return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    // 4. Solana Transaction Setup
    const connection = new Connection(RPC_URL, 'confirmed');

    // Safe parsing for secret keys
    const treasurySecret = JSON.parse(RDW_TREASURY_SECRET_KEY);
    const treasury = Keypair.fromSecretKey(new Uint8Array(treasurySecret));

    const payerSecret = JSON.parse(SOLANA_FEEPAYER_SECRET_KEY);
    const payer = Keypair.fromSecretKey(new Uint8Array(payerSecret));

    const mint = new PublicKey(RDW_MINT);
    const recipientPubkey = new PublicKey(wallet);

    // 5. Token Account Handling & Transfer
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipientPubkey);
    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, treasury.publicKey);

    const rawAmount = Math.floor(amt * 1_000_000); // 6 decimals
    
    const signature = await transfer(
      connection,
      payer,
      treasuryTokenAccount.address,
      recipientTokenAccount.address,
      treasury,
      rawAmount
    );

    // 6. DB Update
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

    return NextResponse.json({ 
      success: true, 
      signature, 
      amount: amt, 
      recipient: recipientTokenAccount.address.toString() 
    });

  } catch (err: any) {
    console.error('Claim process error:', err);
    // Don't leak raw error messages to the client in production
    return NextResponse.json({ error: 'Transaction failed. Please try again later.' }, { status: 500 });
  }
}