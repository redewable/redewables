import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { create, mplCore, fetchCollection } from '@metaplex-foundation/mpl-core';
import { keypairIdentity, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createClient } from '@supabase/supabase-js';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const dynamic = 'force-dynamic';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const TREASURY_WALLET = '3Gzf9jz7jCehX2SvXgEHUpjXoSoraT84JUZLY97Jits5';
const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS || 'g2JyfrSNHEeT9CNYwvANNcLwonPMx5DNDnQaLAwY4oV';

const TIERS = {
  genesis: { name: 'ReDew Genesis License', symbol: 'REDEW-G', tier: 'Genesis', multiplier: '1.5x', price: 2.5, image: 'https://gateway.irys.xyz/6NDA34ypC29jq8ckcVzQWECuPQ7FxxbmQrcu5n4uRoU' },
  core: { name: 'ReDew Core License', symbol: 'REDEW-C', tier: 'Core', multiplier: '1.0x', price: 3.5, image: 'https://gateway.irys.xyz/FZo8XbdCgfBGTTQtkmvssD4Tdvy5ozr62yD5NyKoXhFM' },
  surge: { name: 'ReDew Surge License', symbol: 'REDEW-S', tier: 'Surge', multiplier: '2.0x', price: 4.5, image: 'https://gateway.irys.xyz/6r8Cq11bF4xjySnnQSxqTQWeZB4chK3FSottP9w6mF1r' },
};

// Toggle for devnet testing - set to false for mainnet
const SKIP_PAYMENT_VERIFICATION = process.env.SKIP_PAYMENT_VERIFICATION === 'true';

async function verifyPayment(
  connection: Connection,
  signature: string,
  expectedPayer: string,
  expectedAmount: number
): Promise<{ valid: boolean; error?: string }> {
  
  // In devnet/testing mode, just check transaction exists
  if (SKIP_PAYMENT_VERIFICATION) {
    const tx = await connection.getParsedTransaction(signature, { 
      commitment: 'confirmed', 
      maxSupportedTransactionVersion: 0 
    });
    if (!tx) return { valid: false, error: 'Transaction not found' };
    return { valid: true };
  }

  try {
    const tx = await connection.getParsedTransaction(signature, { 
      commitment: 'confirmed', 
      maxSupportedTransactionVersion: 0 
    });

    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    if (tx.meta?.err) {
      return { valid: false, error: 'Transaction failed on-chain' };
    }

    // getParsedTransaction gives us clean accountKeys with pubkey property
    const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toBase58());

    // Verify payer is first account (fee payer)
    if (accountKeys[0] !== expectedPayer) {
      return { valid: false, error: 'Payment sender mismatch' };
    }

    // Verify treasury received funds
    const treasuryIndex = accountKeys.indexOf(TREASURY_WALLET);
    if (treasuryIndex === -1) {
      return { valid: false, error: 'Treasury not in transaction' };
    }

    // Check balance change for treasury
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];
    const treasuryReceived = (postBalances[treasuryIndex] - preBalances[treasuryIndex]) / LAMPORTS_PER_SOL;

    // Allow small tolerance for rounding
    if (treasuryReceived < expectedAmount - 0.01) {
      return { valid: false, error: `Insufficient payment: expected ${expectedAmount} SOL, received ${treasuryReceived.toFixed(4)} SOL` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const authSecret = process.env.SOLANA_AUTHORITY_SECRET_KEY;

    if (!authSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 1. Parse and validate input
    const body = await request.json();
    const { tier, recipient, paymentSignature, quantity = 1 } = body;

    if (!tier || !['genesis', 'core', 'surge'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    if (!recipient || typeof recipient !== 'string' || recipient.length < 32) {
      return NextResponse.json({ error: 'Invalid recipient wallet' }, { status: 400 });
    }
    if (!paymentSignature || typeof paymentSignature !== 'string') {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return NextResponse.json({ error: 'Invalid quantity (1-10)' }, { status: 400 });
    }

    // 2. Idempotency check - return existing mints if already processed
    const { data: existing } = await supabase
      .from('licenses')
      .select('nft_address')
      .eq('payment_tx', paymentSignature);
    
    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        success: true, 
        nftAddresses: existing.map(r => r.nft_address),
        message: 'Already minted'
      });
    }

    // 3. Payment verification
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const tierData = TIERS[tier as keyof typeof TIERS];
    const expectedAmount = tierData.price * quantity;

    const verification = await verifyPayment(
      connection,
      paymentSignature,
      recipient,
      expectedAmount
    );

    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    // 4. Setup Umi for minting
    const umi = createUmi(DEVNET_RPC).use(mplCore()).use(irysUploader());
    const keypair = umi.eddsa.createKeypairFromSecretKey(
      new Uint8Array(JSON.parse(authSecret))
    );
    umi.use(keypairIdentity(keypair));

    const collection = await fetchCollection(umi, publicKey(COLLECTION_ADDRESS));
    const mintedAddresses: string[] = [];

    // 5. Upsert user record
    const { data: userRow } = await supabase
      .from('users')
      .upsert({ wallet_address: recipient }, { onConflict: 'wallet_address' })
      .select('id')
      .single();

    // 6. Mint NFTs
    for (let i = 1; i <= quantity; i++) {
      const assetSigner = generateSigner(umi);
      
      const uri = await umi.uploader.uploadJson({
        name: tierData.name,
        symbol: tierData.symbol,
        image: tierData.image,
        attributes: [
          { trait_type: 'Tier', value: tierData.tier },
          { trait_type: 'Multiplier', value: tierData.multiplier }
        ]
      });

      await create(umi, {
        asset: assetSigner,
        collection,
        name: tierData.name,
        uri,
        owner: publicKey(recipient)
      }).sendAndConfirm(umi);

      const nftAddress = assetSigner.publicKey.toString();
      mintedAddresses.push(nftAddress);

      await supabase.from('licenses').insert({
        user_id: userRow?.id,
        wallet_address: recipient,
        tier,
        nft_address: nftAddress,
        payment_tx: paymentSignature,
        mint_status: 'minted'
      });
    }

    return NextResponse.json({ success: true, nftAddresses: mintedAddresses });

  } catch (error: any) {
    console.error('Mint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}