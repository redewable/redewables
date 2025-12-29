'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Weather from '../components/Weather';
import Attestations from '../components/Attestations';
import RewardChart from '../components/RewardChart';
import ProjectTimeline from '../components/ProjectTimeline';
import ClaimRewards from '../components/ClaimRewards';
import DocumentModal from '../components/DocumentModal';
import CountdownTimer from '../components/CountdownTimer';
import LicenseModal from '../components/LicenseModal';
import MintGate from '../components/MintGate';

interface DBLicense {
  id: string;
  nft_address: string;
  tier: string;
  minted_at: string;
}

const tierLabels: Record<string, string> = {
  genesis: 'Genesis License',
  core: 'Core License',
  surge: 'Surge License',
};

const tierLetters: Record<string, string> = {
  genesis: 'G',
  core: 'C',
  surge: 'S',
};

const tierMultipliers: Record<string, string> = {
  genesis: '1.5x',
  core: '1.0x',
  surge: '2.0x',
};

const tierPrices: Record<string, string> = {
  genesis: '2.5 SOL',
  core: '3.5 SOL',
  surge: '4.5 SOL',
};

export default function Dashboard() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [displayedPending, setDisplayedPending] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [displayedTotal, setDisplayedTotal] = useState(0);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [landControlVerified, setLandControlVerified] = useState(false);
  const [pendingAnimating, setPendingAnimating] = useState(false);
  const [totalAnimating, setTotalAnimating] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [rewardHistory, setRewardHistory] = useState([
    { month: 'Jul', amount: 320 },
    { month: 'Aug', amount: 480 },
    { month: 'Sep', amount: 290 },
    { month: 'Oct', amount: 610 },
    { month: 'Nov', amount: 825 },
    { month: 'Dec', amount: 0 },
  ]);
  const [displayedHistory, setDisplayedHistory] = useState([
    { month: 'Jul', amount: 320 },
    { month: 'Aug', amount: 480 },
    { month: 'Sep', amount: 290 },
    { month: 'Oct', amount: 610 },
    { month: 'Nov', amount: 825 },
    { month: 'Dec', amount: 0 },
  ]);

  // Fetch licenses from database
  useEffect(() => {
    if (publicKey) {
      fetchLicenses();
    } else {
      setLicenses([]);
      setLoadingLicenses(false);
    }
  }, [publicKey]);

  const fetchLicenses = async () => {
  if (!publicKey) return;
  
  setLoadingLicenses(true);
  try {
    const res = await fetch(`/api/licenses?wallet=${publicKey.toString()}`);
    const data = await res.json();
    
    // Transform DB licenses to display format
    const formattedLicenses = (data.licenses || []).map((lic: DBLicense) => ({
      tier: tierLetters[lic.tier] || 'G',
      name: tierLabels[lic.tier] || 'License',
      mintDate: new Date(lic.minted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      tokenId: `${lic.nft_address.slice(0, 4)}...${lic.nft_address.slice(-4)}`,
      nftAddress: lic.nft_address,
      attributes: [
        { trait: 'Tier', value: tierLabels[lic.tier]?.replace(' License', '') || lic.tier },
        { trait: 'Mint Price', value: tierPrices[lic.tier] || '2.5 SOL' },
        { trait: 'Reward Multiplier', value: tierMultipliers[lic.tier] || '1.0x' },
        { trait: 'Project Access', value: 'All Projects' },
      ],
      dbTier: lic.tier,
    }));
    
    setLicenses(formattedLicenses);
    
    // Calculate pending rewards based on licenses (claimable this period)
    const baseReward = 250;
    const pending = formattedLicenses.reduce((acc: number, lic: any) => {
      const mult = lic.dbTier === 'genesis' ? 1.5 : lic.dbTier === 'surge' ? 2.0 : 1.0;
      return acc + (baseReward * mult);
    }, 0);
    setPendingRewards(Math.round(pending));
    
    // Total earned = sum of history (mock for now)
    // Jul 320 + Aug 480 + Sep 290 + Oct 610 + Nov 825 = 2,525
    setTotalEarned(2525);
    
  } catch (error) {
    console.error('Failed to fetch licenses:', error);
  } finally {
    setLoadingLicenses(false);
  }
};

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setMenuClosing(true);
    setTimeout(() => setMenuClosing(false), 300);
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Animate pending rewards counter
  useEffect(() => {
    if (displayedPending !== pendingRewards) {
      setPendingAnimating(true);
      const startValue = displayedPending;
      const endValue = pendingRewards;
      const duration = endValue < startValue ? 2500 : 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        let eased;
        if (endValue < startValue) {
          eased = 1 - Math.pow(1 - progress, 5);
        } else {
          eased = 1 - Math.pow(1 - progress, 3);
        }
        
        const current = Math.round(startValue + (endValue - startValue) * eased);
        
        setDisplayedPending(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setPendingAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [pendingRewards]);

  // Animate total earned counter
  useEffect(() => {
    if (displayedTotal !== totalEarned) {
      setTotalAnimating(true);
      const startValue = displayedTotal;
      const endValue = totalEarned;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (endValue - startValue) * eased);
        
        setDisplayedTotal(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTotalAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [totalEarned]);

  // Animate history bar
  useEffect(() => {
    const targetDec = rewardHistory[5].amount;
    const currentDec = displayedHistory[5].amount;
    
    if (currentDec !== targetDec) {
      const startValue = currentDec;
      const endValue = targetDec;
      const duration = 1200;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (endValue - startValue) * eased);
        
        setDisplayedHistory(prev => {
          const updated = [...prev];
          updated[5] = { ...updated[5], amount: current };
          return updated;
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [rewardHistory]);

  const handleClaim = () => {
    const claimed = pendingRewards;
    setPendingRewards(0);
    setTotalEarned(prev => prev + claimed);
    setRewardHistory(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        amount: updated[updated.length - 1].amount + claimed
      };
      return updated;
    });
  };

  const handleDocumentVerify = () => {
    setLandControlVerified(true);
    setPendingRewards(prev => prev + 100);
  };

  // Show connect prompt if not connected
  if (!connected) {
    return (
      <div className="dashboard-container">
        <div className="grid-floor"></div>
        <div className="connect-prompt">
          <div className="connect-box">
            <div className="logo">RE<span>DEW</span></div>
            <h1>VALIDATOR DASHBOARD</h1>
            <p>Connect your wallet to view your licenses and rewards</p>
            <button className="connect-btn" onClick={() => setVisible(true)}>
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MintGate>
      <div className="dashboard-container">
        <div className="testnet-banner">⚠️ DEVNET MODE — Real Wallet, Test Network</div>
        <div className="grid-floor"></div>

        {!menuOpen && !menuClosing && (
          <button className="menu-burger" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
        )}

        <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
          <button className="menu-close" onClick={handleCloseMenu}>
            ✕
          </button>
          
          <div className="logo">RE<span>DEW</span></div>
          
          <nav className="nav">
            <a href="/dashboard" className="nav-link active" onClick={handleCloseMenu}>Dashboard</a>
            <a href="/mint" className="nav-link" onClick={handleCloseMenu}>Mint License</a>
            <a href="#" className="nav-link" onClick={handleCloseMenu}>
              Attestations
              {!landControlVerified && <span className="nav-badge">1</span>}
            </a>
            <a href="#" className="nav-link" onClick={handleCloseMenu}>Rewards</a>
          </nav>

          <div className="wallet-info">
            <div className="wallet-label">Connected</div>
            <div className="wallet-address">{publicKey ? shortenAddress(publicKey.toString()) : ''}</div>
          </div>
        </aside>

        {menuOpen && <div className="menu-overlay" onClick={handleCloseMenu}></div>}

        <DocumentModal 
          isOpen={documentOpen}
          onClose={() => setDocumentOpen(false)}
          onVerify={handleDocumentVerify}
        />

        <LicenseModal
          isOpen={selectedLicense !== null}
          onClose={() => setSelectedLicense(null)}
          license={selectedLicense}
        />

        <main className="main-content">
          <div className="page-header">
            <h1 className="page-title">Validator Dashboard</h1>
            <p className="page-subtitle">Welcome back, validator</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Licenses Owned</div>
              <div className="stat-value">{loadingLicenses ? '...' : licenses.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Rewards</div>
              <div className={`stat-value ${pendingAnimating ? 'animating' : ''}`}>
                {displayedPending.toLocaleString()} <span>$RDW</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Earned</div>
              <div className={`stat-value ${totalAnimating ? 'animating' : ''}`}>
                {displayedTotal.toLocaleString()} <span>$RDW</span>
              </div>
            </div>
          </div>

          <div className="content-grid">
            <div className="panel">
              <h2 className="panel-title">My Licenses</h2>
              <div className="license-list">
                {loadingLicenses ? (
                  <div className="loading-licenses">Loading licenses...</div>
                ) : licenses.length === 0 ? (
                  <div className="empty-licenses">
                    <p>No licenses found</p>
                    <a href="/mint" className="mint-link">Mint Your First License →</a>
                  </div>
                ) : (
                  licenses.map((license, index) => (
                    <div 
                      key={index} 
                      className="license-card clickable"
                      onClick={() => setSelectedLicense(license)}
                    >
                      <div className="license-icon">{license.tier}</div>
                      <div>
                        <div className="license-name">{license.name}</div>
                        <div className="license-meta">{license.tokenId} • {license.mintDate}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Attestations 
                onOpenDocument={() => setDocumentOpen(true)}
                landControlVerified={landControlVerified}
              />
              <RewardChart history={displayedHistory} total={displayedTotal} />
            </div>

            <div className="panel">
              <h2 className="panel-title">Project Status</h2>
              <div className="project-card">
                <div className="project-header">
                  <div>
                    <div className="project-name">ReDew Anson</div>
                    <div className="project-location">400 MW BESS • Jones County, TX</div>
                  </div>
                  <span className="project-badge">DEVELOPMENT</span>
                </div>
                <ProjectTimeline />
              </div>
              <Weather />
              <CountdownTimer />
              <ClaimRewards 
                pending={displayedPending} 
                onClaim={handleClaim} 
              />
            </div>
          </div>
        </main>
        
        <footer className="dashboard-footer">
          <div className="footer-links">
            <a href="https://redewable.com" target="_blank">ReDewable.com</a>
            <a href="/litepaper" target="_blank">Litepaper</a>
            <a href="https://twitter.com" target="_blank">Twitter</a>
            <a href="https://discord.com" target="_blank">Discord</a>
          </div>
          <div className="footer-copy">© 2025 ReDewable Energy Company, LLC</div>
        </footer>
      </div>
    </MintGate>
  );
}