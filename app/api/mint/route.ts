import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { create, mplCore, fetchCollection } from '@metaplex-foundation/mpl-core';
import { keypairIdentity, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const COLLECTION_ADDRESS = '8VSWKB4KdvJhTNTKwzZH4izWdPDXr9t8sFcBsX9WfTH3';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ server-only
);

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
    const body = await request.json();
    const tier = body?.tier as keyof typeof TIERS;
    const recipient = body?.recipient as string;
    const paymentSignature = body?.paymentSignature as string;
    const quantityRaw = body?.quantity;

    if (!tier || !TIERS[tier]) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    if (!recipient || typeof recipient !== 'string') {
      return NextResponse.json({ error: 'No recipient address' }, { status: 400 });
    }
    if (!paymentSignature || typeof paymentSignature !== 'string' || paymentSignature.length < 20) {
      return NextResponse.json({ error: 'paymentSignature required' }, { status: 400 });
    }

    const qty = Math.max(1, Math.min(10, Number(quantityRaw ?? 1) || 1));
    const tierData = TIERS[tier];

    // User upsert (safe)
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .upsert({ wallet_address: recipient }, { onConflict: 'wallet_address' })
      .select('id')
      .single();

    if (userErr || !userRow) {
      return NextResponse.json({ error: 'Failed to create user', details: userErr }, { status: 500 });
    }

    // Load any existing batch rows for this payment
    const { data: existingRows, error: loadErr } = await supabase
      .from('licenses')
      .select('id, batch_index, batch_size, nft_address, serial_number, tier')
      .eq('payment_tx', paymentSignature)
      .order('batch_index', { ascending: true });

    if (loadErr) {
      return NextResponse.json({ error: 'Failed to load batch', details: loadErr }, { status: 500 });
    }

    // If batch exists, enforce same qty + tier
    if (existingRows && existingRows.length > 0) {
      const existingSize = existingRows[0]?.batch_size ?? existingRows.length;
      const existingTier = existingRows[0]?.tier;
      if (existingSize !== qty) {
        return NextResponse.json(
          { error: `Batch exists for this paymentSignature with quantity=${existingSize}. Do not reuse with quantity=${qty}.` },
          { status: 400 }
        );
      }
      if (existingTier && existingTier !== tier) {
        return NextResponse.json(
          { error: `Batch exists for this paymentSignature with tier=${existingTier}. Do not reuse with tier=${tier}.` },
          { status: 400 }
        );
      }
    } else {
      // Reserve rows (one per batch_index). Using upsert row-by-row makes uniqueness behavior explicit.
      for (let i = 1; i <= qty; i++) {
        const { error: reserveErr } = await supabase
          .from('licenses')
          .upsert(
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
            { onConflict: 'payment_tx,batch_index' } // ✅ composite
          );

        if (reserveErr) {
          return NextResponse.json(
            {
              error: 'Failed to reserve batch rows',
              details: reserveErr,
              hint: 'Ensure UNIQUE(payment_tx,batch_index) exists and payment_tx alone is NOT unique.',
            },
            { status: 500 }
          );
        }
      }
    }

    // Reload batch rows
    const { data: batchRows, error: batchErr } = await supabase
      .from('licenses')
      .select('id, batch_index, batch_size, nft_address, serial_number')
      .eq('payment_tx', paymentSignature)
      .order('batch_index', { ascending: true });

    if (batchErr || !batchRows) {
      return NextResponse.json({ error: 'Failed to reload batch', details: batchErr }, { status: 500 });
    }

    // If already minted all, return
    const minted = batchRows.filter(r => !!r.nft_address).map(r => r.nft_address as string);
    if (minted.length === qty) {
      return NextResponse.json({ success: true, tier, quantity: qty, nftAddresses: minted, reused: true });
    }

    // Setup UMI once
    const umi = createUmi(DEVNET_RPC)
      .use(mplCore())
      .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

    // Load authority wallet
    const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
    const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
    umi.use(keypairIdentity(keypair));

    const collection = await fetchCollection(umi, publicKey(COLLECTION_ADDRESS));

    // Mint missing rows sequentially
    const mintedAddresses: string[] = [...minted];

    for (const row of batchRows) {
      if (row.nft_address) continue;

      const metadata = {
        name: tierData.name,
        symbol: tierData.symbol,
        description: tierData.description,
        image: tierData.image,
        external_url: 'https://redewables.com/dashboard',
        attributes: [
          { trait_type: 'Tier', value: tierData.tier },
          { trait_type: 'Reward Multiplier', value: tierData.multiplier },
          { trait_type: 'Project', value: 'ReDew Anson' },
          { trait_type: 'Batch', value: `${row.batch_index}/${qty}` },
        ],
      };

      const metadataUri = await umi.uploader.uploadJson(metadata);
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

      const { error: updErr } = await supabase
        .from('licenses')
        .update({ nft_address: nftAddress, mint_status: 'minted' })
        .eq('id', row.id);

      if (updErr) {
        return NextResponse.json(
          { success: true, tier, quantity: qty, nftAddresses: mintedAddresses, warning: 'Minted but failed to update DB row', details: updErr },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ success: true, tier, quantity: qty, nftAddresses: mintedAddresses });
  } catch (error) {
    console.error('Mint error:', error);
    return NextResponse.json({ error: 'Mint failed' }, { status: 500 });
  }
}