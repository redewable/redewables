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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    const { tier, recipient, paymentSignature } = await request.json();

    if (!tier || !TIERS[tier as keyof typeof TIERS]) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (!recipient) {
      return NextResponse.json({ error: 'No recipient address' }, { status: 400 });
    }

    const tierData = TIERS[tier as keyof typeof TIERS];

    console.log(`🎫 Minting ${tierData.name} to ${recipient}`);

    const umi = createUmi(DEVNET_RPC)
      .use(mplCore())
      .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

    // Load authority wallet
    const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
    const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
    umi.use(keypairIdentity(keypair));

    // Create metadata
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
      ],
    };

    const metadataUri = await umi.uploader.uploadJson(metadata);
    const collection = await fetchCollection(umi, publicKey(COLLECTION_ADDRESS));
    const assetSigner = generateSigner(umi);

    const result = await create(umi, {
      asset: assetSigner,
      collection: collection,
      name: tierData.name,
      uri: metadataUri,
      owner: publicKey(recipient),
    }).sendAndConfirm(umi);

    console.log(`✅ Minted: ${assetSigner.publicKey}`);

    // Save to database
    // First, create or get user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', recipient)
      .single();

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ wallet_address: recipient })
        .select('id')
        .single();
      user = newUser;
    }

    // Save license
    const { error: licenseError } = await supabase
      .from('licenses')
      .insert({
        user_id: user?.id,
        wallet_address: recipient,
        nft_address: assetSigner.publicKey.toString(),
        tier: tier,
        payment_tx: paymentSignature,
      });

    if (licenseError) {
      console.error('DB Error:', licenseError);
    } else {
      console.log('✅ License saved to database');
    }

    return NextResponse.json({
      success: true,
      nftAddress: assetSigner.publicKey.toString(),
      metadataUri,
    });

  } catch (error) {
    console.error('Mint error:', error);
    return NextResponse.json({ error: 'Mint failed' }, { status: 500 });
  }
}