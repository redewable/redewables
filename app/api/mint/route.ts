import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { create, mplCore, fetchCollection } from '@metaplex-foundation/mpl-core';
import { keypairIdentity, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createClient } from '@supabase/supabase-js';

// ✅ Force dynamic to ensure Vercel doesn't try to pre-render this during build
export const dynamic = 'force-dynamic';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const COLLECTION_ADDRESS = '8VSWKB4KdvJhTNTKwzZH4izWdPDXr9t8sFcBsX9WfTH3';

const TIERS = {
  genesis: {
    name: 'ReDew Genesis License',
    symbol: 'REDEW-G',
    description: 'Genesis tier validator license. 1.5x reward multiplier.',
    tier: 'Genesis',
    multiplier: '1.5x',
    image: 'https://gateway.irys.xyz/6NDA34ypC29jq8ckcVzQWECuPQ7FxxbmQrcu5n4uRoU',
  },
  core: {
    name: 'ReDew Core License',
    symbol: 'REDEW-C',
    description: 'Core tier validator license. 1.0x reward multiplier.',
    tier: 'Core',
    multiplier: '1.0x',
    image: 'https://gateway.irys.xyz/FZo8XbdCgfBGTTQtkmvssD4Tdvy5ozr62yD5NyKoXhFM',
  },
  surge: {
    name: 'ReDew Surge License',
    symbol: 'REDEW-S',
    description: 'Surge tier validator license. 2.0x reward multiplier.',
    tier: 'Surge',
    multiplier: '2.0x',
    image: 'https://gateway.irys.xyz/6r8Cq11bF4xjySnnQSxqTQWeZB4chK3FSottP9w6mF1r',
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authSecret = process.env.SOLANA_AUTHORITY_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey || !authSecret) {
      return NextResponse.json({ error: 'Server environment not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const tier = body?.tier as keyof typeof TIERS;
    const recipient = body?.recipient as string;
    const paymentSignature = body?.paymentSignature as string;
    const quantityRaw = body?.quantity;

    if (!tier || !TIERS[tier]) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    if (!recipient) return NextResponse.json({ error: 'No recipient address' }, { status: 400 });
    if (!paymentSignature || paymentSignature.length < 20) {
      return NextResponse.json({ error: 'Valid paymentSignature required' }, { status: 400 });
    }

    const qty = Math.max(1, Math.min(10, Number(quantityRaw ?? 1) || 1));
    const tierData = TIERS[tier];

    // 1. User check/creation
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .upsert({ wallet_address: recipient }, { onConflict: 'wallet_address' })
      .select('id')
      .single();

    if (userErr || !userRow) throw new Error('Failed to identify user');

    // 2. Batch reservation logic (Idempotency)
    for (let i = 1; i <= qty; i++) {
      await supabase.from('licenses').upsert(
        {
          user_id: userRow.id,
          wallet_address: recipient,
          tier,
          payment_tx: paymentSignature,
          batch_index: i,
          batch_size: qty,
          mint_status: 'reserved',
          minted_at: new Date().toISOString(),
        },
        { onConflict: 'payment_tx,batch_index' }
      );
    }

    // 3. Reload batch to see what needs minting
    const { data: batchRows } = await supabase
      .from('licenses')
      .select('*')
      .eq('payment_tx', paymentSignature)
      .order('batch_index', { ascending: true });

    if (!batchRows) throw new Error('Batch reload failed');

    // 4. Setup Metaplex Umi
    const umi = createUmi(DEVNET_RPC)
      .use(mplCore())
      .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

    const authoritySecret = JSON.parse(authSecret);
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(authoritySecret));
    umi.use(keypairIdentity(keypair));

    const collection = await fetchCollection(umi, publicKey(COLLECTION_ADDRESS));
    const mintedAddresses: string[] = [];

    // 5. Minting Loop
    for (const row of batchRows) {
      if (row.nft_address) {
        mintedAddresses.push(row.nft_address);
        continue;
      }

      const metadataUri = await umi.uploader.uploadJson({
        name: tierData.name,
        symbol: tierData.symbol,
        description: tierData.description,
        image: tierData.image,
        attributes: [
            { trait_type: 'Tier', value: tierData.tier },
            { trait_type: 'Multiplier', value: tierData.multiplier },
            { trait_type: 'Batch', value: `${row.batch_index}/${qty}` }
        ],
      });

      const assetSigner = generateSigner(umi);
      await create(umi, {
        asset: assetSigner,
        collection,
        name: tierData.name,
        uri: metadataUri,
        owner: publicKey(recipient),
      }).sendAndConfirm(umi);

      const nftAddress = assetSigner.publicKey.toString();
      mintedAddresses.push(nftAddress);

      await supabase
        .from('licenses')
        .update({ nft_address: nftAddress, mint_status: 'minted' })
        .eq('id', row.id);
    }

    return NextResponse.json({ success: true, tier, quantity: qty, nftAddresses: mintedAddresses });

  } catch (error: any) {
    console.error('Minting Route Crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}