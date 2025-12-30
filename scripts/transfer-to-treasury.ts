import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

const RDW_MINT = 'DSrszSzWyGr96RQ5E4MnezpDEto4KPJL2kjxmpzRE6Zd';
const TREASURY = '3Gzf9jz7jCehX2SvXgEHUpjXoSoraT84JUZLY97Jits5';

async function main() {
  console.log('💸 Transferring $RDW to treasury...\n');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Load CLI wallet (current holder)
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log('From:', payer.publicKey.toString());
  console.log('To:', TREASURY);

  const mint = new PublicKey(RDW_MINT);
  const treasuryPubkey = new PublicKey(TREASURY);

  // Get source token account
  const sourceAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log('Source token account:', sourceAccount.address.toString());
  console.log('Current balance:', Number(sourceAccount.amount) / 1e6, '$RDW\n');

  // Get or create treasury token account
  console.log('Creating treasury token account...');
  const treasuryAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    treasuryPubkey
  );

  console.log('Treasury token account:', treasuryAccount.address.toString());

  // Transfer 999 million (keep 1 million for testing)
  const transferAmount = 999_000_000 * 1e6;

  console.log('\nTransferring 999,000,000 $RDW...');
  const signature = await transfer(
    connection,
    payer,
    sourceAccount.address,
    treasuryAccount.address,
    payer,
    transferAmount
  );

  console.log('✅ Transfer complete:', signature);
  console.log('\nTreasury now holds 999,000,000 $RDW');
  console.log('CLI wallet retains 1,000,000 $RDW for testing');
  console.log('\nView on Solscan:');
  console.log(`https://solscan.io/tx/${signature}?cluster=devnet`);
}

main().catch(console.error);