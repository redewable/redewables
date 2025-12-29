'use client';

import { useState, useEffect } from 'react';

const tiers = [
  {
    name: 'Genesis',
    letter: 'G',
    price: 2.5,
    priceUSD: 375,
    supply: 1000,
    minted: 347,
    multiplier: '1.5x',
    description: 'Early supporter tier with maximum rewards',
    perks: ['1.5x reward multiplier', 'Priority attestation access', 'Genesis badge', 'All project access'],
  },
  {
    name: 'Core',
    letter: 'C',
    price: 3.5,
    priceUSD: 525,
    supply: 1000,
    minted: 182,
    multiplier: '1.0x',
    description: 'Standard validator license',
    perks: ['1.0x reward multiplier', 'Standard attestation access', 'Core badge', 'All project access'],
  },
  {
    name: 'Surge',
    letter: 'S',
    price: 4.5,
    priceUSD: 675,
    supply: 500,
    minted: 41,
    multiplier: '2.0x',
    description: 'Premium tier with boosted rewards',
    perks: ['2.0x reward multiplier', 'Priority attestation access', 'Surge badge', 'All project access', 'Governance voting'],
  },
];

const recentMints = [
  { wallet: '7xK9...3mPq', tier: 'Genesis', time: '2m ago' },
  { wallet: '9aB2...7kLm', tier: 'Surge', time: '5m ago' },
  { wallet: '3cD4...9nOp', tier: 'Core', time: '8m ago' },
  { wallet: '5eF6...1qRs', tier: 'Genesis', time: '12m ago' },
  { wallet: '2gH8...4tUv', tier: 'Core', time: '15m ago' },
];

export default function Mint() {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletBalance, setWalletBalance] = useState(12.5);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [minting, setMinting] = useState(false);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);

  // Rotate live feed
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeedIndex(prev => (prev + 1) % recentMints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalSupply = tiers.reduce((acc, t) => acc + t.supply, 0);
  const totalMinted = tiers.reduce((acc, t) => acc + t.minted, 0);
  const totalRaised = tiers.reduce((acc, t) => acc + (t.minted * t.price), 0);
  const targetRaise = tiers.reduce((acc, t) => acc + (t.supply * t.price), 0);

  const selectedTierData = selectedTier !== null ? tiers[selectedTier] : null;
  const totalCost = selectedTierData ? selectedTierData.price * quantity : 0;
  const insufficientBalance = totalCost > walletBalance;

  const handleSelect = (index: number) => {
    if (selectedTier === index) {
      setSelectedTier(null);
      setQuantity(1);
    } else {
      setSelectedTier(index);
      setQuantity(1);
    }
  };

  const handleMintClick = () => {
    if (!walletConnected) {
      setWalletConnected(true);
      setWalletBalance(12.5);
      return;
    }
    setShowDisclaimer(true);
  };

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    setShowConfirm(true);
  };

  const handleConfirmMint = () => {
    setMinting(true);
    setTimeout(() => {
      setMinting(false);
      setShowConfirm(false);
      setShowSuccess(true);
      setWalletBalance(prev => prev - totalCost);
    }, 2500);
  };

  const handleShareTwitter = () => {
    const text = `Just minted ${quantity} ${selectedTierData?.name} License${quantity > 1 ? 's' : ''} on @ReDewProtocol! 🔋⚡ Join the validator network securing renewable energy infrastructure. #ReDew #DePIN #Solana`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="mint-container">
      <div className="testnet-banner">⚠️ TESTNET MODE — Mock Data</div>
      <div className="grid-floor"></div>

      {/* Live Mint Feed */}
      <div className="mint-feed">
        <div className="feed-item">
          <span className="feed-dot"></span>
          <span className="feed-wallet">{recentMints[currentFeedIndex].wallet}</span>
          <span className="feed-text">just minted</span>
          <span className="feed-tier">{recentMints[currentFeedIndex].tier}</span>
          <span className="feed-time">{recentMints[currentFeedIndex].time}</span>
        </div>
      </div>

      {/* Header */}
      <div className="mint-nav">
        <a href="/dashboard" className="back-link">← Dashboard</a>
        <div className="wallet-connect">
          {walletConnected ? (
            <div className="wallet-connected">
              <span className="wallet-balance">{walletBalance.toFixed(2)} SOL</span>
              <button className="wallet-btn connected" onClick={() => setWalletConnected(false)}>
                7xK9...3mPq
              </button>
            </div>
          ) : (
            <button className="wallet-btn" onClick={() => { setWalletConnected(true); setWalletBalance(12.5); }}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div className="mint-content">
        <div className="mint-header">
          <h1 className="mint-title">MINT YOUR <span>LICENSE</span></h1>
          <p className="mint-subtitle">Join the ReDew validator network and earn rewards for securing renewable energy infrastructure</p>
        </div>

        <div className="raise-progress">
          <div className="raise-stats">
            <div className="raise-stat">
              <span className="raise-label">Total Raised</span>
              <span className="raise-value">{totalRaised.toLocaleString()} SOL</span>
            </div>
            <div className="raise-stat">
              <span className="raise-label">Target</span>
              <span className="raise-value">{targetRaise.toLocaleString()} SOL</span>
            </div>
            <div className="raise-stat">
              <span className="raise-label">Licenses Minted</span>
              <span className="raise-value">{totalMinted} / {totalSupply}</span>
            </div>
          </div>
          <div className="raise-bar">
            <div 
              className="raise-bar-fill" 
              style={{ width: `${(totalMinted / totalSupply) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="tier-grid">
          {tiers.map((tier, index) => (
            <div 
              key={index}
              className={`tier-card ${selectedTier === index ? 'selected' : ''}`}
            >
              <div className="tier-header">
                <div className="tier-icon">{tier.letter}</div>
                <div className="tier-badge">{tier.multiplier} REWARDS</div>
              </div>
              
              <h3 className="tier-name">{tier.name}</h3>
              <p className="tier-description">{tier.description}</p>
              
              <div className="tier-price">
                <span className="price-sol">{tier.price} SOL</span>
                <span className="price-usd">≈ ${tier.priceUSD}</span>
              </div>

              <div className="tier-supply">
                <div className="supply-text">
                  <span>{tier.minted} / {tier.supply} minted</span>
                  <span>{Math.round((tier.minted / tier.supply) * 100)}%</span>
                </div>
                <div className="supply-bar">
                  <div 
                    className="supply-bar-fill"
                    style={{ width: `${(tier.minted / tier.supply) * 100}%` }}
                  ></div>
                </div>
              </div>

              <ul className="tier-perks">
                {tier.perks.map((perk, i) => (
                  <li key={i}>✓ {perk}</li>
                ))}
              </ul>

              <div className="tier-actions">
                <button 
                  className={`tier-btn ${selectedTier === index ? 'selected' : ''}`}
                  onClick={() => handleSelect(index)}
                >
                  {selectedTier === index ? 'Selected ✓' : 'Select'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Mint Panel - Shows when tier selected */}
        {selectedTier !== null && selectedTierData && (
          <div className="mint-panel">
            <div className="mint-panel-preview">
              <div className="nft-preview">
                <div className="nft-preview-inner">
                  <div className="nft-icon">{selectedTierData.letter}</div>
                  <div className="nft-name">{selectedTierData.name} License</div>
                  <div className="nft-multiplier">{selectedTierData.multiplier} Rewards</div>
                </div>
                <div className="nft-glow"></div>
              </div>
            </div>
            
            <div className="mint-panel-details">
              <div className="quantity-selector">
                <span className="quantity-label">Quantity</span>
                <div className="quantity-controls">
                  <button 
                    className="quantity-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >−</button>
                  <span className="quantity-value">{quantity}</span>
                  <button 
                    className="quantity-btn"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    disabled={quantity >= 10}
                  >+</button>
                </div>
              </div>

              <div className="mint-summary">
                <div className="summary-row">
                  <span>Price per license</span>
                  <span>{selectedTierData.price} SOL</span>
                </div>
                <div className="summary-row">
                  <span>Quantity</span>
                  <span>×{quantity}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{totalCost.toFixed(1)} SOL</span>
                </div>
                {walletConnected && insufficientBalance && (
                  <div className="balance-warning">
                    ⚠️ Insufficient balance ({walletBalance.toFixed(2)} SOL)
                  </div>
                )}
              </div>

              <button 
                className={`mint-btn ${minting ? 'minting' : ''}`}
                onClick={handleMintClick}
                disabled={minting || (walletConnected && insufficientBalance)}
              >
                {!walletConnected ? 'Connect Wallet' : minting ? 'Minting...' : `Mint for ${totalCost.toFixed(1)} SOL`}
              </button>
            </div>
          </div>
        )}

        <div className="mint-footer">
          <p>By minting, you agree to our <a href="#">Terms of Service</a> and acknowledge the <a href="#" onClick={(e) => { e.preventDefault(); setShowDisclaimer(true); }}>Risk Disclaimer</a></p>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="modal-overlay" onClick={() => setShowDisclaimer(false)}>
          <div className="disclaimer-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">RISK DISCLAIMER</h2>
              <button className="modal-close-btn" onClick={() => setShowDisclaimer(false)}>✕</button>
            </div>
            <div className="disclaimer-content">
              <p>Before minting a ReDew Validator License, please understand:</p>
              <ul>
                <li><strong>No Guarantee of Returns:</strong> Validator rewards depend on project performance and network participation.</li>
                <li><strong>Development Risk:</strong> ReDew Anson and future projects are in development stages.</li>
                <li><strong>Token Volatility:</strong> $RDW token value may fluctuate significantly.</li>
                <li><strong>Regulatory Uncertainty:</strong> Cryptocurrency regulations are evolving.</li>
                <li><strong>Smart Contract Risk:</strong> While audited, smart contracts may contain vulnerabilities.</li>
              </ul>
              <p className="disclaimer-note">This is not financial advice. Consult with qualified professionals before making investment decisions.</p>
              <div className="disclaimer-actions">
                <button className="disclaimer-btn cancel" onClick={() => setShowDisclaimer(false)}>Cancel</button>
                <button className="disclaimer-btn accept" onClick={handleDisclaimerAccept}>I Understand, Continue</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && selectedTierData && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <h2 className="modal-title">CONFIRM MINT</h2>
              <button className="modal-close-btn" onClick={() => setShowConfirm(false)}>✕</button>
            </div>
            <div className="confirm-content">
              <div className="confirm-preview">
                <div className="confirm-nft">
                  <div className="confirm-nft-icon">{selectedTierData.letter}</div>
                </div>
                <div className="confirm-details">
                  <div className="confirm-tier">{selectedTierData.name} License</div>
                  <div className="confirm-qty">Quantity: {quantity}</div>
                </div>
              </div>

              <div className="confirm-breakdown">
                <div className="breakdown-row">
                  <span>Mint Price</span>
                  <span>{selectedTierData.price} × {quantity} SOL</span>
                </div>
                <div className="breakdown-row">
                  <span>Network Fee</span>
                  <span>~0.00025 SOL</span>
                </div>
                <div className="breakdown-row total">
                  <span>Total</span>
                  <span>{totalCost.toFixed(2)} SOL</span>
                </div>
              </div>

              <div className="confirm-wallet">
                <span>Wallet Balance</span>
                <span className={insufficientBalance ? 'insufficient' : ''}>{walletBalance.toFixed(2)} SOL</span>
              </div>

              <div className="confirm-actions">
                <button className="confirm-btn cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button 
                  className={`confirm-btn mint ${minting ? 'minting' : ''}`}
                  onClick={handleConfirmMint}
                  disabled={minting}
                >
                  {minting ? (
                    <>
                      <span className="spinner"></span>
                      Minting...
                    </>
                  ) : (
                    'Confirm Mint'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && selectedTierData && (
        <div className="modal-overlay success-overlay">
          <div className="confetti">
            {[...Array(50)].map((_, i) => (
              <div key={i} className="confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#00FF9D', '#00cc7d', '#ffd93d', '#ffffff'][Math.floor(Math.random() * 4)]
              }}></div>
            ))}
          </div>
          <div className="success-modal">
            <div className="success-glow"></div>
            <div className="success-icon">✓</div>
            <h2 className="success-title">MINT SUCCESSFUL!</h2>
            <p className="success-message">
              You now own {quantity} {selectedTierData.name} License{quantity > 1 ? 's' : ''}
            </p>
            
            <div className="success-nft">
              <div className="success-nft-icon">{selectedTierData.letter}</div>
              <div className="success-nft-details">
                <div className="success-nft-name">{selectedTierData.name} License</div>
                <div className="success-nft-id">Token ID: {Math.random().toString(36).substring(2, 8)}...{Math.random().toString(36).substring(2, 6)}</div>
              </div>
            </div>

            <div className="success-actions">
              <button className="success-btn secondary" onClick={handleShareTwitter}>
                Share on 𝕏
              </button>
              <a href="/dashboard" className="success-btn primary">
                View Dashboard
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}