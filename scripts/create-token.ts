import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🪙 Creating $RDW Token on devnet...\n');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log('Wallet:', payer.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL\n');

  // Create mint
  console.log('Creating token mint...');
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    6 // decimals
  );

  console.log('✅ Token created:', mint.toString());

  // Create token account
  console.log('\nCreating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log('✅ Token account:', tokenAccount.address.toString());

  // Mint 1 billion tokens
  console.log('\nMinting 1,000,000,000 $RDW...');
  const mintAmount = 1_000_000_000 * 1e6; // 1 billion with 6 decimals

  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    mintAmount
  );

  console.log('✅ Minted 1,000,000,000 $RDW\n');

  // Save token info
  const tokenInfo = {
    mint: mint.toString(),
    tokenAccount: tokenAccount.address.toString(),
    decimals: 6,
    totalSupply: '1000000000',
  };

  fs.writeFileSync(
    path.join(__dirname, 'rdw-token.json'),
    JSON.stringify(tokenInfo, null, 2)
  );

  console.log('Token info saved to scripts/rdw-token.json');
  console.log('\n🎉 $RDW Token ready!');
  console.log('Mint address:', mint.toString());
}

main().catch(console.error);