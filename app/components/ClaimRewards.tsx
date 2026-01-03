'use client';

import { useState } from 'react';

interface ClaimRewardsProps {
  pending: number;
  wallet: string | null;
  onClaim: () => void;
}

export default function ClaimRewards({ pending, wallet, onClaim }: ClaimRewardsProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleClaim = async () => {
    if (pending === 0 || !wallet) return;
    
    setClaiming(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          amount: pending,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Claim failed');
      }

      setTxSignature(data.signature);
      setClaimed(true);
      onClaim();
      
      setTimeout(() => {
        setClaimed(false);
        setTxSignature(null);
      }, 5000);

    } catch (err: any) {
      console.error('Claim error:', err);
      setError(err.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={`claim-widget ${pending > 0 ? 'has-rewards' : ''}`}>
      <div className="claim-header">
        <span className="claim-title">PENDING REWARDS</span>
      </div>
      <div className="claim-amount">
        <span className="claim-value">{pending.toLocaleString()}</span>
        <span className="claim-token">$RDW</span>
      </div>
      {pending > 0 && (
        <div className="claim-info">
          <div className="claim-row">
            <span>From attestations</span>
            <span>+{pending.toLocaleString()} $RDW</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="claim-error">{error}</div>
      )}
      
      {txSignature && (
        <a 
          href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="claim-tx-link"
        >
          View transaction ↗
        </a>
      )}
      
      <button 
        className={`claim-btn ${claiming ? 'claiming' : ''} ${claimed ? 'claimed' : ''} ${pending === 0 ? 'empty' : ''}`}
        onClick={handleClaim}
        disabled={claiming || claimed || pending === 0 || !wallet}
      >
        {claiming ? 'Claiming...' : claimed ? '✓ Claimed!' : pending === 0 ? 'No Rewards' : !wallet ? 'Connect Wallet' : 'Claim Rewards'}
      </button>
      {pending > 0 && !claimed && (
        <div className="claim-note">
          Gas fee: ~0.00025 SOL
        </div>
      )}
    </div>
  );
}