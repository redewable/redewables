import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey, percentAmount } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import * as fs from 'fs';
import * as path from 'path';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

async function main() {
  console.log('📝 Uploading $RDW token image and metadata...\n');

  const umi = createUmi('https://api.devnet.solana.com')
    .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  // Upload image
  console.log('Uploading image to Arweave...');
  const imagePath = path.join(process.cwd(), 'public/nft/rdw-token.png');
  const imageBuffer = fs.readFileSync(imagePath);
  
  const [imageUri] = await umi.uploader.upload([{
    buffer: imageBuffer,
    fileName: 'rdw-token.png',
    displayName: 'RDW Token',
    uniqueName: 'rdw-token',
    contentType: 'image/png',
    extension: 'png',
    tags: [{ name: 'Content-Type', value: 'image/png' }],
  }]);
  
  console.log('✅ Image uploaded:', imageUri);

  // Upload metadata
  const metadata = {
    name: 'ReDew Token',
    symbol: 'RDW',
    description: 'Reward token for ReDew validators securing renewable energy infrastructure.',
    image: imageUri,
  };

  console.log('\nUploading metadata...');
  const metadataUri = await umi.uploader.uploadJson(metadata);
  console.log('✅ Metadata URI:', metadataUri);

  console.log('\nCreating on-chain token metadata...');
  await createV1(umi, {
    mint: publicKey(RDW_MINT),
    name: 'ReDew Token',
    symbol: 'RDW',
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  console.log('\n✅ Token metadata complete!');
  console.log('Image:', imageUri);
  console.log('Metadata:', metadataUri);
  console.log('\nRefresh Phantom to see $RDW with logo.');
}

main().catch(console.error);