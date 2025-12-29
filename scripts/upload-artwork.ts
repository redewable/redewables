import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { keypairIdentity } from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function uploadArtwork() {
  console.log('🔧 Setting up Umi...');
  
  const umi = createUmi(DEVNET_RPC)
    .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  console.log('👛 Wallet:', keypair.publicKey);

  const images = [
    { name: 'Genesis', file: 'ChatGenesis.png' },
    { name: 'Core', file: 'ChatCore.png' },
    { name: 'Surge', file: 'ChatSurge.png' },
  ];

  const results: Record<string, string> = {};

  for (const img of images) {
    const filePath = path.join(process.cwd(), 'public', 'nft', img.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      continue;
    }

    console.log(`📤 Uploading ${img.name}...`);
    
    const fileBuffer = fs.readFileSync(filePath);
    const [uri] = await umi.uploader.upload([{
      buffer: fileBuffer,
      fileName: img.file,
      displayName: img.name,
      uniqueName: img.file,
      contentType: 'image/png',
      extension: 'png',
      tags: [{ name: 'Content-Type', value: 'image/png' }],
    }]);

    console.log(`✅ ${img.name}: ${uri}`);
    results[img.name.toLowerCase()] = uri;
  }

  console.log('\n📋 Copy these URIs to your mint API:\n');
  console.log(JSON.stringify(results, null, 2));

  // Save to file
  const outputPath = path.join(process.cwd(), 'scripts', 'artwork-uris.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved to ${outputPath}`);
}

uploadArtwork().catch(console.error);