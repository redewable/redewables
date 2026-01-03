import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, createV1 } from '@metaplex-foundation/mpl-core';
import { generateSigner, keypairIdentity, publicKey } from '@metaplex-foundation/umi';

export const mintValidatorLicense = async (userWalletAddress: string) => {
  // 1. Initialize Umi with Core support
  const umi = createUmi('https://api.devnet.solana.com').use(mplCore());

  // 2. Setup your Authority using pure Umi (Server-side compatible)
  const secretKeyString = process.env.SOLANA_PAYER_SECRET_KEY;
  if (!secretKeyString) throw new Error("Missing SOLANA_PAYER_SECRET_KEY");

  const secretKey = JSON.parse(secretKeyString);
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
  
  // Attach the identity to Umi
  umi.use(keypairIdentity(keypair));

  // 3. Generate a new address for the NFT asset
  const asset = generateSigner(umi);

  try {
    const tx = await createV1(umi, {
      asset,
      name: 'ReDew Validator License',
      // This URI should point to your JSON metadata (tier, image, etc.)
      uri: 'https://arweave.net/your-metadata-json',
      owner: publicKey(userWalletAddress),
    }).sendAndConfirm(umi);

    return { 
      success: true, 
      assetAddress: asset.publicKey.toString(),
      signature: tx.signature 
    };
  } catch (error: any) {
    console.error("Minting failed:", error);
    throw new Error(error.message || "Unknown minting error");
  }
};