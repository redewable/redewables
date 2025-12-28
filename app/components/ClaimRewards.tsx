'use client';

import { useState } from 'react';

interface ClaimRewardsProps {
  pending: number;
  onClaim: () => void;
}

export default function ClaimRewards({ pending, onClaim }: ClaimRewardsProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    if (pending === 0) return;
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      setClaimed(true);
      onClaim();
      setTimeout(() => setClaimed(false), 3000);
    }, 2000);
  };

  return (
    <div className="claim-widget">
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
      <button 
        className={`claim-btn ${claiming ? 'claiming' : ''} ${claimed ? 'claimed' : ''} ${pending === 0 ? 'empty' : ''}`}
        onClick={handleClaim}
        disabled={claiming || claimed || pending === 0}
      >
        {claiming ? 'Claiming...' : claimed ? '✓ Claimed!' : pending === 0 ? 'No Rewards' : 'Claim Rewards'}
      </button>
      {pending > 0 && (
        <div className="claim-note">
          Gas fee: ~0.00025 SOL
        </div>
      )}
    </div>
  );
}