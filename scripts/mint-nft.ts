import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  create,
  mplCore,
  fetchCollection,
} from '@metaplex-foundation/mpl-core';
import { 
  keypairIdentity, 
  generateSigner,
  publicKey,
} from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const COLLECTION_ADDRESS = '8VSWKB4KdvJhTNTKwzZH4izWdPDXr9t8sFcBsX9WfTH3';

// Tier configurations
const TIERS = {
  genesis: {
    name: 'ReDew Genesis License',
    symbol: 'REDEW-G',
    description: 'Genesis tier validator license. 1.5x reward multiplier. Early supporter access.',
    tier: 'Genesis',
    multiplier: '1.5x',
    price: 2.5,
  },
  core: {
    name: 'ReDew Core License',
    symbol: 'REDEW-C', 
    description: 'Core tier validator license. 1.0x reward multiplier. Standard validator access.',
    tier: 'Core',
    multiplier: '1.0x',
    price: 3.5,
  },
  surge: {
    name: 'ReDew Surge License',
    symbol: 'REDEW-S',
    description: 'Surge tier validator license. 2.0x reward multiplier. Premium validator with governance.',
    tier: 'Surge',
    multiplier: '2.0x',
    price: 4.5,
  }
};

async function mintNFT(tierKey: 'genesis' | 'core' | 'surge') {
  const tier = TIERS[tierKey];
  
  console.log(`🔧 Setting up Umi...`);
  
  const umi = createUmi(DEVNET_RPC)
    .use(mplCore())
    .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  console.log(`👛 Wallet: ${keypair.publicKey}`);
  console.log(`🎫 Minting: ${tier.name}`);

  // Create NFT metadata
  const metadata = {
    name: tier.name,
    symbol: tier.symbol,
    description: tier.description,
    image: 'https://arweave.net/placeholder', // Update with real artwork
    external_url: 'https://redewables.com/dashboard',
    attributes: [
      { trait_type: 'Tier', value: tier.tier },
      { trait_type: 'Reward Multiplier', value: tier.multiplier },
      { trait_type: 'Price (SOL)', value: tier.price.toString() },
      { trait_type: 'Project', value: 'ReDew Anson' },
      { trait_type: 'Network', value: 'Solana' },
    ],
    properties: {
      category: 'utility',
      creators: [{ address: keypair.publicKey.toString(), share: 100 }]
    }
  };

  console.log('📤 Uploading metadata...');
  const metadataUri = await umi.uploader.uploadJson(metadata);
  console.log(`✅ Metadata: ${metadataUri}`);

  // Fetch collection
  const collection = await fetchCollection(umi, publicKey(COLLECTION_ADDRESS));
  
  // Create the NFT
  console.log('🏗️ Minting NFT...');
  const assetSigner = generateSigner(umi);
  
  await create(umi, {
    asset: assetSigner,
    collection: collection,
    name: tier.name,
    uri: metadataUri,
  }).sendAndConfirm(umi);

  console.log('✅ NFT Minted!');
  console.log(`📍 NFT Address: ${assetSigner.publicKey}`);
  console.log(`🔗 View on Solscan: https://solscan.io/token/${assetSigner.publicKey}?cluster=devnet`);
  
  return assetSigner.publicKey;
}

// Get tier from command line
const tierArg = process.argv[2] as 'genesis' | 'core' | 'surge';

if (!tierArg || !TIERS[tierArg]) {
  console.log('Usage: npx tsx scripts/mint-nft.ts <genesis|core|surge>');
  process.exit(1);
}

mintNFT(tierArg).catch(console.error);