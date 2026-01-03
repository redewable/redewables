'use client';

export const dynamic = 'force-dynamic';

import '../mint.css';
import '../modals.css';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import DashboardLayout from '../components/DashboardLayout';

interface TierData {
  name: string;
  letter: string;
  price: number;
  priceUSD: number;
  supply: number;
  minted: number;
  multiplier: string;
  description: string;
  perks: string[];
}

interface RecentMint {
  wallet: string;
  tier: string;
  time: string;
}

const baseTiers: Omit<TierData, 'minted'>[] = [
  {
    name: 'Genesis',
    letter: 'G',
    price: 2.5,
    priceUSD: 0, // Will be calculated dynamically
    supply: 1000,
    multiplier: '1.5x',
    description: 'Early supporter tier with maximum rewards',
    perks: ['1.5x reward multiplier', 'Priority attestation access', 'Genesis badge', 'All project access'],
  },
  {
    name: 'Core',
    letter: 'C',
    price: 3.5,
    priceUSD: 0, // Will be calculated dynamically
    supply: 1000,
    multiplier: '1.0x',
    description: 'Standard validator license',
    perks: ['1.0x reward multiplier', 'Standard attestation access', 'Core badge', 'All project access'],
  },
  {
    name: 'Surge',
    letter: 'S',
    price: 4.5,
    priceUSD: 0, // Will be calculated dynamically
    supply: 500,
    multiplier: '2.0x',
    description: 'Premium tier with boosted rewards',
    perks: ['2.0x reward multiplier', 'Priority attestation access', 'Surge badge', 'All project access', 'Governance voting'],
  },
];

function getEnv(name: string): string | null {
  const v = (process.env as any)[name] as string | undefined;
  return v && v.trim().length > 0 ? v : null;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Mint() {
  // External wallet adapter
  const { publicKey: adapterPublicKey, connected: adapterConnected, disconnect: adapterDisconnect, signTransaction: adapterSignTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  
  // Privy (email/social login - for auth display only)
  const { login, logout, authenticated: privyAuthenticated, user } = usePrivy();
  
  // Unified wallet state
  const connected = adapterConnected || privyAuthenticated;
  const publicKey = adapterPublicKey; // Only external wallet can sign transactions
  
  // Sign transaction (only available for external wallets)
  const signTransaction = adapterSignTransaction;
  
  // Unified disconnect
  const disconnect = useCallback(async () => {
    if (adapterConnected) {
      await adapterDisconnect();
    }
    if (privyAuthenticated) {
      await logout();
    }
  }, [adapterConnected, adapterDisconnect, privyAuthenticated, logout]);
  
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

  // Dynamic data state
  const [mintedCounts, setMintedCounts] = useState<{ genesis: number; core: number; surge: number }>({ genesis: 0, core: 0, surge: 0 });
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [networkStats, setNetworkStats] = useState({ validators: 0, power: 0 });
  const [solPrice, setSolPrice] = useState<number>(150); // Default fallback price

  const supabase = useMemo(() => {
    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  // Fetch minted counts and recent mints
  useEffect(() => {
    async function fetchMintData() {
      if (!supabase) {
        setDataLoading(false);
        return;
      }

      try {
        // Fetch all minted licenses
        const { data: licenses, error } = await supabase
          .from('licenses')
          .select('tier, wallet_address, minted_at')
          .eq('mint_status', 'minted')
          .order('minted_at', { ascending: false });

        if (error) throw error;

        // Count by tier and calculate network stats
        const counts = { genesis: 0, core: 0, surge: 0 };
        const uniqueWallets = new Set<string>();
        let totalPower = 0;

        (licenses || []).forEach((l: any) => {
          const tier = l.tier?.toLowerCase();
          uniqueWallets.add(l.wallet_address);
          if (tier === 'genesis') {
            counts.genesis++;
            totalPower += 1.5;
          } else if (tier === 'core') {
            counts.core++;
            totalPower += 1.0;
          } else if (tier === 'surge') {
            counts.surge++;
            totalPower += 2.0;
          }
        });
        setMintedCounts(counts);
        setNetworkStats({ validators: uniqueWallets.size, power: totalPower });

        // Get recent mints (last 10)
        const recent = (licenses || []).slice(0, 10).map((l: any) => ({
          wallet: `${l.wallet_address.slice(0, 4)}...${l.wallet_address.slice(-4)}`,
          tier: l.tier?.charAt(0).toUpperCase() + l.tier?.slice(1) || 'Unknown',
          time: l.minted_at ? timeAgo(new Date(l.minted_at)) : 'just now',
        }));
        setRecentMints(recent);

      } catch (err) {
        console.error('Error fetching mint data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    fetchMintData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchMintData, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  // Fetch SOL price from CoinGecko
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        const data = await response.json();
        if (data.solana?.usd) {
          setSolPrice(data.solana.usd);
        }
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
        // Keep default fallback price
      }
    }

    fetchSolPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchSolPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Combine base tiers with dynamic minted counts and USD prices
  const tiers: TierData[] = baseTiers.map((tier, index) => ({
    ...tier,
    priceUSD: Math.round(tier.price * solPrice),
    minted: index === 0 ? mintedCounts.genesis : index === 1 ? mintedCounts.core : mintedCounts.surge,
  }));

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
    if (recentMints.length === 0) return;
    const interval = setInterval(() => {
      setCurrentFeedIndex(prev => (prev + 1) % recentMints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [recentMints.length]);

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
      // Smooth scroll to mint panel after render
      setTimeout(() => {
        document.querySelector('.mint-panel')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
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

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      console.log('Payment sent:', signature);

      // Wait for confirmation with timeout and retry
      let confirmed = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          const status = await connection.getSignatureStatus(signature);
          if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
            confirmed = true;
            break;
          }
          if (status.value?.err) {
            throw new Error('Transaction failed on-chain');
          }
        } catch (e) {
          // Ignore and retry
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!confirmed) {
        // Last check - maybe it confirmed but we missed it
        const finalStatus = await connection.getSignatureStatus(signature);
        if (!finalStatus.value || finalStatus.value.err) {
          throw new Error('Transaction confirmation timeout. Check your wallet - if SOL was deducted, contact support with signature: ' + signature);
        }
      }
      
      console.log('Payment confirmed:', signature);

      // Call mint API with retry logic
      let mintResponse = null;
      let mintError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch('/api/mint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tier: tierKey,
              recipient: publicKey.toString(),
              paymentSignature: signature,
              quantity,
            }),
          });

          const data = await response.json();

          if (data.success) {
            mintResponse = data;
            break;
          } else {
            mintError = data.error;
            // If transaction not found, wait and retry
            if (data.error?.includes('not found')) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            throw new Error(data.error || 'Mint failed');
          }
        } catch (e: any) {
          mintError = e.message;
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      if (!mintResponse) {
        throw new Error(mintError || 'Mint failed after retries. Signature: ' + signature);
      }

      setMinting(false);
      setShowConfirm(false);
      setShowConfetti(true);
      setShowSuccess(true);
      setMintedNFT(mintResponse.nftAddresses?.[0] || null);
      
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
    <DashboardLayout showConnectPrompt={false}>
      <div className="mint-container">
        <div className="testnet-banner">⚠️ DEVNET MODE — Real Wallet, Test Network</div>
        <div className="grid-floor"></div>

        <div className="mint-feed">
        {recentMints.length > 0 ? (
          <div className="feed-item">
            <span className="feed-dot"></span>
            <span className="feed-wallet">{recentMints[currentFeedIndex]?.wallet}</span>
            <span className="feed-text">just minted</span>
            <span 
              className="feed-tier"
              style={{ 
                color: recentMints[currentFeedIndex]?.tier === 'Genesis' ? '#00FF9D' 
                     : recentMints[currentFeedIndex]?.tier === 'Core' ? '#C0C0C0' 
                     : '#00FFFF' 
              }}
            >
              {recentMints[currentFeedIndex]?.tier}
            </span>
            <span className="feed-time">{recentMints[currentFeedIndex]?.time}</span>
          </div>
        ) : (
          <div className="feed-item">
            <span className="feed-dot"></span>
            <span className="feed-text">Be the first to mint a validator license!</span>
          </div>
        )}
      </div>

      <div className="mint-nav">
        <a href="/dashboard" className="back-link">← Dashboard</a>
       <div className="wallet-connect">
  {adapterConnected && publicKey ? (
    <div className="wallet-connected">
      <span className="wallet-balance">{walletBalance.toFixed(2)} SOL</span>
      <button className="wallet-btn connected" onClick={() => disconnect()}>
        {shortenAddress(publicKey.toString())}
      </button>
    </div>
  ) : privyAuthenticated ? (
    <div className="wallet-connected">
      <span className="user-email">{user?.email?.address || 'Logged In'}</span>
      <button className="wallet-btn" onClick={() => setVisible(true)}>
        Connect Wallet to Mint
      </button>
    </div>
  ) : (
    <div className="auth-buttons">
      <button className="wallet-btn" onClick={() => setVisible(true)}>
        Connect Wallet
      </button>
      <button className="email-btn" onClick={() => login()}>
        Email Login
      </button>
    </div>
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

        <div className="network-stats">
          <div className="network-stat">
            <span className="network-stat-value">{dataLoading ? '—' : networkStats.validators}</span>
            <span className="network-stat-label">Validators</span>
          </div>
          <div className="network-stat">
            <span className="network-stat-value">{dataLoading ? '—' : networkStats.power.toFixed(1)}x</span>
            <span className="network-stat-label">Network Power</span>
          </div>
          <div className="network-stat">
            <span className="network-stat-value">
              <span style={{ color: '#00FF9D' }}>{mintedCounts.genesis}</span>
              {' / '}
              <span style={{ color: '#C0C0C0' }}>{mintedCounts.core}</span>
              {' / '}
              <span style={{ color: '#00FFFF' }}>{mintedCounts.surge}</span>
            </span>
            <span className="network-stat-label">G / C / S Minted</span>
          </div>
        </div>

        <div className="tier-grid">
          {tiers.map((tier, index) => {
            const status = getTierStatus(index);
            const tierClass = tier.name.toLowerCase();
            const unlockText = index === 1 ? 'Unlocks after Genesis' : index === 2 ? 'Unlocks after Core' : '';
            return (
              <div key={index} className={`tier-card tier-${tierClass} ${status} ${selectedTier === index ? 'selected' : ''}`}>
                {status === 'sold-out' && <div className="tier-overlay sold-out-overlay">SOLD OUT</div>}
                {status === 'locked' && (
                  <div className="tier-overlay locked-overlay">
                    <div className="locked-content">
                      <span className="locked-label">LOCKED</span>
                      <span className="locked-unlock">{unlockText}</span>
                    </div>
                  </div>
                )}
                
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
    </DashboardLayout>
  );
}