import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { updateV1, fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import * as fs from 'fs';
import * as path from 'path';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

async function main() {
  console.log('🔄 Updating $RDW token image...\n');

  const umi = createUmi('https://api.devnet.solana.com')
    .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  // Upload new image
  console.log('Uploading new image to Arweave...');
  const imagePath = path.join(process.cwd(), 'public/nft/rdw-token.png');
  const imageBuffer = fs.readFileSync(imagePath);
  
  const [imageUri] = await umi.uploader.upload([{
    buffer: imageBuffer,
    fileName: 'rdw-token.png',
    displayName: 'RDW Token',
    uniqueName: 'rdw-token-v3',
    contentType: 'image/png',
    extension: 'png',
    tags: [{ name: 'Content-Type', value: 'image/png' }],
  }]);
  
  console.log('✅ Image uploaded:', imageUri);

  // Upload new metadata
  const metadata = {
    name: 'ReDew Token',
    symbol: 'RDW',
    description: 'Reward token for ReDew validators securing renewable energy infrastructure.',
    image: imageUri,
  };

  console.log('\nUploading new metadata...');
  const metadataUri = await umi.uploader.uploadJson(metadata);
  console.log('✅ Metadata URI:', metadataUri);

  // Fetch existing metadata
  const mint = publicKey(RDW_MINT);
  const existingMetadata = await fetchMetadataFromSeeds(umi, { mint });
  
  console.log('\nUpdating on-chain metadata...');
  await updateV1(umi, {
    mint,
    data: {
      name: 'ReDew Token',
      symbol: 'RDW',
      uri: metadataUri,
      sellerFeeBasisPoints: existingMetadata.sellerFeeBasisPoints,
      creators: existingMetadata.creators,
    },
  }).sendAndConfirm(umi);

  console.log('\n✅ Token metadata updated!');
  console.log('New image:', imageUri);
  console.log('\nRefresh Phantom to see the new $RDW logo.');
}

main().catch(console.error);