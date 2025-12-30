import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey, percentAmount } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import * as fs from 'fs';
import * as path from 'path';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';

async function main() {
  console.log('📝 Adding $RDW token metadata...\n');

  const umi = createUmi('https://api.devnet.solana.com')
    .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  umi.use(keypairIdentity(keypair));

  // Upload metadata
  const metadata = {
    name: 'ReDew Token',
    symbol: 'RDW',
    description: 'Reward token for ReDew validators securing renewable energy infrastructure.',
    image: 'https://gateway.irys.xyz/6NDA34ypC29jq8ckcVzQWECuPQ7FxxbmQrcu5n4uRoU',
  };

  console.log('Uploading metadata...');
  const uri = await umi.uploader.uploadJson(metadata);
  console.log('Metadata URI:', uri);

  console.log('\nCreating token metadata...');
  await createV1(umi, {
    mint: publicKey(RDW_MINT),
    name: 'ReDew Token',
    symbol: 'RDW',
    uri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  console.log('✅ Token metadata added!');
  console.log('\nRefresh Phantom to see $RDW with name and logo.');
}

main().catch(console.error);