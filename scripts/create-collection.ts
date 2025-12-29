import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  createCollection, 
  mplCore,
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

async function main() {
  console.log('🔧 Setting up Umi...');
  
  // Initialize Umi with devnet
  const umi = createUmi(DEVNET_RPC)
    .use(mplCore())
    .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

  // Load wallet from Solana CLI config
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  console.log('👛 Wallet:', keypair.publicKey);

  // Upload collection metadata
  console.log('📤 Uploading collection metadata...');
  
  const collectionMetadata = {
    name: 'ReDew Validator Licenses',
    symbol: 'REDEW',
    description: 'Validator licenses for the ReDew DePIN protocol. Validators verify real-world energy infrastructure milestones and earn $RDW rewards.',
    image: 'https://arweave.net/placeholder', // We'll update this
    external_url: 'https://redewables.com',
    properties: {
      category: 'utility',
      creators: [
        {
          address: keypair.publicKey,
          share: 100
        }
      ]
    }
  };

  const metadataUri = await umi.uploader.uploadJson(collectionMetadata);
  console.log('✅ Metadata URI:', metadataUri);

  // Create the collection
  console.log('🏗️ Creating collection...');
  
  const collectionSigner = generateSigner(umi);
  
  await createCollection(umi, {
    collection: collectionSigner,
    name: 'ReDew Validator Licenses',
    uri: metadataUri,
  }).sendAndConfirm(umi);

  console.log('✅ Collection created!');
  console.log('📍 Collection Address:', collectionSigner.publicKey);
  console.log('');
  console.log('Save this address! You\'ll need it for minting.');
  
  // Save to file for reference
  const outputPath = path.join(__dirname, 'collection-address.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    address: collectionSigner.publicKey,
    network: 'devnet',
    createdAt: new Date().toISOString()
  }, null, 2));
  
  console.log(`💾 Saved to ${outputPath}`);
}

main().catch(console.error);