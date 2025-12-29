'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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
    minted: 0,
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
    minted: 0,
    multiplier: '2.0x',
    description: 'Premium tier with boosted rewards',
    perks: ['2.0x reward multiplier', 'Priority attestation access', 'Surge badge', 'All project access', 'Governance voting'],
  },
];

const recentMints = [
  { wallet: '7xK9...3mPq', tier: 'Genesis', time: '2m ago' },
  { wallet: '9aB2...7kLm', tier: 'Genesis', time: '5m ago' },
  { wallet: '3cD4...9nOp', tier: 'Genesis', time: '8m ago' },
  { wallet: '5eF6...1qRs', tier: 'Genesis', time: '12m ago' },
  { wallet: '2gH8...4tUv', tier: 'Genesis', time: '15m ago' },
];

export default function Mint() {
  const { publicKey, connected, disconnect, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [minting, setMinting] = useState(false);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey && connection) {
      connection.getBalance(publicKey).then(balance => {
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      });
    } else {
      setWalletBalance(0);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeedIndex(prev => (prev + 1) % recentMints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getActiveTierIndex = () => {
    if (tiers[0].minted < tiers[0].supply) return 0;
    if (tiers[1].minted < tiers[1].supply) return 1;
    return 2;
  };

  const activeTierIndex = getActiveTierIndex();
  const totalSupply = tiers.reduce((acc, t) => acc + t.supply, 0);
  const totalMinted = tiers.reduce((acc, t) => acc + t.minted, 0);
  const totalRaised = tiers.reduce((acc, t) => acc + (t.minted * t.price), 0);
  const targetRaise = tiers.reduce((acc, t) => acc + (t.supply * t.price), 0);
  const selectedTierData = selectedTier !== null ? tiers[selectedTier] : null;
  const totalCost = selectedTierData ? selectedTierData.price * quantity : 0;
  const insufficientBalance = totalCost > walletBalance;

  const handleSelect = (index: number) => {
    if (index !== activeTierIndex) return;
    if (selectedTier === index) {
      setSelectedTier(null);
      setQuantity(1);
    } else {
      setSelectedTier(index);
      setQuantity(1);
    }
  };

  const handleMintClick = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    setShowDisclaimer(true);
  };

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    setShowConfirm(true);
  };

  const handleConfirmMint = async () => {
    if (!publicKey || !selectedTierData || !signTransaction) return;
    
    setMinting(true);
    setErrorMessage(null);
    
    try {
      const tierKey = ['genesis', 'core', 'surge'][selectedTier!];
      const totalSOL = selectedTierData.price * quantity;
      
      const { Transaction, SystemProgram, PublicKey: SolanaPublicKey, LAMPORTS_PER_SOL: LAMPORTS } = await import('@solana/web3.js');
      
      const treasuryWallet = new SolanaPublicKey('3Gzf9jz7jCehX2SvXgEHUpjXoSoraT84JUZLY97Jits5');
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryWallet,
          lamports: Math.floor(totalSOL * LAMPORTS),
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      
      console.log('Payment confirmed:', signature);

      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierKey,
          recipient: publicKey.toString(),
          paymentSignature: signature,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Mint failed');
      }

      setMinting(false);
      setShowConfirm(false);
      setShowConfetti(true);
      setShowSuccess(true);
      setMintedNFT(data.nftAddress);
      
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
      
      setTimeout(() => {
        setShowConfetti(false);
      }, 4000);

    } catch (error: any) {
      console.error('Mint error:', error);
      setMinting(false);
      
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        setErrorMessage('Transaction cancelled. \nNo SOL was charged.');
      } else {
        setErrorMessage(error.message || 'Mint failed. Please try again.');
      }
    }
  };

  const handleShareTwitter = () => {
    const text = `Just minted ${quantity} ${selectedTierData?.name} License${quantity > 1 ? 's' : ''} on @ReDewProtocol! 🔋⚡ Join the validator network securing renewable energy infrastructure. #ReDew #DePIN #Solana`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getTierStatus = (index: number) => {
    if (index < activeTierIndex) return 'sold-out';
    if (index === activeTierIndex) return 'active';
    return 'locked';
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="mint-container">
      <div className="testnet-banner">⚠️ DEVNET MODE — Real Wallet, Test Network</div>
      <div className="grid-floor"></div>

      <div className="mint-feed">
        <div className="feed-item">
          <span className="feed-dot"></span>
          <span className="feed-wallet">{recentMints[currentFeedIndex].wallet}</span>
          <span className="feed-text">just minted</span>
          <span className="feed-tier">{recentMints[currentFeedIndex].tier}</span>
          <span className="feed-time">{recentMints[currentFeedIndex].time}</span>
        </div>
      </div>

      <div className="mint-nav">
        <a href="/dashboard" className="back-link">← Dashboard</a>
        <div className="wallet-connect">
          {connected && publicKey ? (
            <div className="wallet-connected">
              <span className="wallet-balance">{walletBalance.toFixed(2)} SOL</span>
              <button className="wallet-btn connected" onClick={() => disconnect()}>
                {shortenAddress(publicKey.toString())}
              </button>
            </div>
          ) : (
            <button className="wallet-btn" onClick={() => setVisible(true)}>
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
            <div className="raise-bar-fill" style={{ width: `${(totalMinted / totalSupply) * 100}%` }}></div>
          </div>
        </div>

        <div className="tier-grid">
          {tiers.map((tier, index) => {
            const status = getTierStatus(index);
            return (
              <div key={index} className={`tier-card ${status} ${selectedTier === index ? 'selected' : ''}`}>
                {status === 'sold-out' && <div className="tier-overlay sold-out-overlay">SOLD OUT</div>}
                {status === 'locked' && <div className="tier-overlay locked-overlay">🔒 LOCKED</div>}
                
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
                    <div className="supply-bar-fill" style={{ width: `${(tier.minted / tier.supply) * 100}%` }}></div>
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
                    disabled={status !== 'active'}
                  >
                    {status === 'sold-out' ? 'Sold Out' : status === 'locked' ? 'Locked' : selectedTier === index ? 'Selected ✓' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

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
                  <button className="quantity-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>−</button>
                  <span className="quantity-value">{quantity}</span>
                  <button className="quantity-btn" onClick={() => setQuantity(Math.min(10, quantity + 1))} disabled={quantity >= 10}>+</button>
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
                {connected && insufficientBalance && (
                  <div className="balance-warning">⚠️ Insufficient balance ({walletBalance.toFixed(2)} SOL)</div>
                )}
              </div>

              <button 
                className={`mint-btn ${minting ? 'minting' : ''}`}
                onClick={handleMintClick}
                disabled={minting || (connected && insufficientBalance)}
              >
                {!connected ? 'Connect Wallet' : minting ? 'Minting...' : `Mint for ${totalCost.toFixed(1)} SOL`}
              </button>
            </div>
          </div>
        )}

        <div className="mint-footer">
          <p>By minting, you agree to our <a href="#">Terms of Service</a> and acknowledge the <a href="#" onClick={(e) => { e.preventDefault(); setShowDisclaimer(true); }}>Risk Disclaimer</a></p>
        </div>
      </div>

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

      {showConfirm && selectedTierData && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <h2 className="modal-title">CONFIRM MINT</h2>
              <button className="modal-close-btn" onClick={() => !minting && setShowConfirm(false)}>✕</button>
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

              {minting ? (
                <div className="minting-status">
                  <div className="minting-spinner"></div>
                  <div className="minting-text">Minting your license...</div>
                  <div className="minting-subtext">This may take up to 30 seconds. Please don't close this window.</div>
                </div>
              ) : (
                <div className="confirm-actions">
                  <button className="confirm-btn cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
                  <button className="confirm-btn mint" onClick={handleConfirmMint}>Confirm Mint</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccess && selectedTierData && (
        <div className="modal-overlay success-overlay">
          {showConfetti && (
            <div className="confetti">
              {[...Array(50)].map((_, i) => (
                <div key={i} className="confetti-piece" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: '4s',
                  backgroundColor: ['#00FF9D', '#00cc7d', '#ffd93d', '#ffffff'][i % 4]
                }}></div>
              ))}
            </div>
          )}
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
                <div className="success-nft-id">Token ID: {mintedNFT}</div>
              </div>
            </div>

            <div className="success-actions">
              <button className="success-btn secondary" onClick={handleShareTwitter}>Share on 𝕏</button>
              <a href="/dashboard" className="success-btn primary">View Dashboard</a>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="modal-overlay" onClick={() => setErrorMessage(null)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <div className="error-icon">✕</div>
            <h2 className="error-title">TRANSACTION FAILED</h2>
            <p className="error-message">{errorMessage}</p>
            <button className="error-btn" onClick={() => setErrorMessage(null)}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}