'use client';

import { useState } from 'react';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';

const TREASURY_WALLET = 'E4ZDgh4a6gUuCANfWTCAzXpTRUA72zC1vosDMQinayHc';

interface MintButtonProps {
  tier: string;
  price: number;
}

export default function MintButton({ tier, price }: MintButtonProps) {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [status, setStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle');

  const handleMint = async () => {
    const solanaWallet = wallets[0];
    
    if (!solanaWallet) {
      toast.error('Please connect your Solana wallet first!');
      return;
    }

    // Wrap the entire minting process in a promise-based toast
    toast.promise(
      (async () => {
        setStatus('busy');

        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        
        // 1. Build the Transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(solanaWallet.address),
            toPubkey: new PublicKey(TREASURY_WALLET),
            lamports: Math.floor(price * LAMPORTS_PER_SOL),
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(solanaWallet.address);

        // 2. Sign and Send with Privy
        const { signature } = await signAndSendTransaction({
          transaction: transaction as any, 
          wallet: solanaWallet,
        });

        // 3. Trigger Server-Side Minting
        const response = await fetch('/api/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier,
            recipient: solanaWallet.address,
            paymentSignature: signature,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Minting failed');
        }

        setStatus('success');
        return `Successfully minted your ${tier} license!`;
      })(),
      {
        loading: `Purchasing ${tier} license...`,
        success: (message) => message,
        error: (err) => {
          setStatus('error');
          return err.message || 'Transaction failed';
        },
      }
    );
  };

  return (
    <button
      onClick={handleMint}
      disabled={status === 'busy' || status === 'success'}
      className={`
        px-8 py-3 rounded-lg font-bold transition-all transform active:scale-95
        ${status === 'idle' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg' : ''}
        ${status === 'busy' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : ''}
        ${status === 'success' ? 'bg-green-600 text-white cursor-default' : ''}
        ${status === 'error' ? 'bg-red-600 text-white hover:bg-red-500' : ''}
      `}
    >
      {status === 'idle' && `Purchase ${tier} (${price} SOL)`}
      {status === 'busy' && (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      )}
      {status === 'success' && '✅ License Secured'}
      {status === 'error' && 'Retry Purchase'}
    </button>
  );
}