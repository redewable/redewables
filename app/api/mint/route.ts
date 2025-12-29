import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { create, mplCore, fetchCollection } from '@metaplex-foundation/mpl-core';
import { keypairIdentity, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const COLLECTION_ADDRESS = '8VSWKB4KdvJhTNTKwzZH4izWdPDXr9t8sFcBsX9WfTH3';

const TIERS = {
  genesis: {
    name: 'ReDew Genesis License',
    symbol: 'REDEW-G',
    description: 'Genesis tier validator license. 1.5x reward multiplier.',
    tier: 'Genesis',
    multiplier: '1.5x',
  },
  core: {
    name: 'ReDew Core License',
    symbol: 'REDEW-C',
    description: 'Core tier validator license. 1.0x reward multiplier.',
    tier: 'Core',
    multiplier: '1.0x',
  },
  surge: {
    name: 'ReDew Surge License',
    symbol: 'REDEW-S',
    description: 'Surge tier validator license. 2.0x reward multiplier.',
    tier: 'Surge',
    multiplier: '2.0x',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { tier, recipient } = await request.json();

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
      image: 'https://arweave.net/placeholder',
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

    await create(umi, {
      asset: assetSigner,
      collection: collection,
      name: tierData.name,
      uri: metadataUri,
      owner: publicKey(recipient),
    }).sendAndConfirm(umi);

    console.log(`✅ Minted: ${assetSigner.publicKey}`);

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