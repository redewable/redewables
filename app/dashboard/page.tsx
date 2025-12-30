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

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);

  // Licenses state
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);

  // Rewards state
  const [pendingRewards, setPendingRewards] = useState(0);
  const [displayedPending, setDisplayedPending] = useState(0);
  const [pendingAnimating, setPendingAnimating] = useState(false);

  const [totalEarned, setTotalEarned] = useState(0);
  const [displayedTotal, setDisplayedTotal] = useState(0);
  const [totalAnimating, setTotalAnimating] = useState(false);

  const [rdwBalance, setRdwBalance] = useState(0);
  const [displayedRdwBalance, setDisplayedRdwBalance] = useState(0);
  const [rdwAnimating, setRdwAnimating] = useState(false);

  // Document verification
  const [documentOpen, setDocumentOpen] = useState(false);
  const [landControlVerified, setLandControlVerified] = useState(false);

  // Reward history for chart
  const [rewardHistory, setRewardHistory] = useState([
    { month: 'Jul', amount: 0 },
    { month: 'Aug', amount: 0 },
    { month: 'Sep', amount: 0 },
    { month: 'Oct', amount: 0 },
    { month: 'Nov', amount: 0 },
    { month: 'Dec', amount: 0 },
  ]);
  const [displayedHistory, setDisplayedHistory] = useState([
    { month: 'Jul', amount: 0 },
    { month: 'Aug', amount: 0 },
    { month: 'Sep', amount: 0 },
    { month: 'Oct', amount: 0 },
    { month: 'Nov', amount: 0 },
    { month: 'Dec', amount: 0 },
  ]);

  // Fetch all data when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchLicenses();
      fetchRdwBalance();
      fetchRewards();
    } else {
      setLicenses([]);
      setLoadingLicenses(false);
      setPendingRewards(0);
      setTotalEarned(0);
      setRdwBalance(0);
    }
  }, [publicKey]);

  const fetchLicenses = async () => {
    if (!publicKey) return;

    setLoadingLicenses(true);
    try {
      const res = await fetch(`/api/licenses?wallet=${publicKey.toString()}`);
      const data = await res.json();

      const formattedLicenses = (data.licenses || []).map((lic: DBLicense) => ({
        tier: tierLetters[lic.tier] || 'G',
        name: tierLabels[lic.tier] || 'License',
        mintDate: new Date(lic.minted_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
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
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
    } finally {
      setLoadingLicenses(false);
    }
  };

  const fetchRdwBalance = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/balance?wallet=${publicKey.toString()}`);
      const data = await response.json();
      setRdwBalance(data.balance || 0);
    } catch (error) {
      console.error('Failed to fetch RDW balance:', error);
    }
  };

  const fetchRewards = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/rewards?wallet=${publicKey.toString()}`);
      const data = await response.json();

      setPendingRewards(data.pendingRewards || 0);
      setTotalEarned(data.totalClaimed || 0);

      if (data.totalClaimed > 0) {
        setRewardHistory(prev => {
          const updated = [...prev];
          updated[5] = { ...updated[5], amount: data.totalClaimed };
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    }
  };

  // Animation: Pending rewards counter
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
        const eased = endValue < startValue
          ? 1 - Math.pow(1 - progress, 5)
          : 1 - Math.pow(1 - progress, 3);
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

  // Animation: Total earned counter
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

  // Animation: RDW balance counter
  useEffect(() => {
    if (displayedRdwBalance !== rdwBalance) {
      setRdwAnimating(true);
      const startValue = displayedRdwBalance;
      const endValue = rdwBalance;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (endValue - startValue) * eased);

        setDisplayedRdwBalance(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setRdwAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [rdwBalance]);

  // Animation: History bar
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

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setMenuClosing(true);
    setTimeout(() => setMenuClosing(false), 300);
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleClaim = () => {
    const claimed = pendingRewards;
    setPendingRewards(0);
    setTotalEarned(prev => prev + claimed);
    setRewardHistory(prev => {
      const updated = [...prev];
      updated[5] = { ...updated[5], amount: updated[5].amount + claimed };
      return updated;
    });

    setTimeout(() => {
      fetchRdwBalance();
      fetchRewards();
    }, 2000);
  };

  const handleDocumentVerify = () => {
    setLandControlVerified(true);
    setPendingRewards(prev => prev + 100);
  };

  const handleRewardEarned = (amount: number) => {
    setPendingRewards(prev => prev + amount);
  };

  const scrollToSection = (sectionId: string) => {
    handleCloseMenu();
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Connect prompt
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
            <button className="nav-link nav-btn" onClick={() => scrollToSection('attestations')}>
              Attestations
            </button>
            <button className="nav-link nav-btn" onClick={() => scrollToSection('rewards')}>
              Rewards
            </button>
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
            <div className="stat-card">
              <div className="stat-label">$RDW Balance</div>
              <div className={`stat-value ${rdwAnimating ? 'animating' : ''}`}>
                {displayedRdwBalance.toLocaleString()} <span>$RDW</span>
              </div>
            </div>
          </div>

          <div className="content-grid">
            {/* LEFT PANEL: Licenses, Claim, Attestations, History */}
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

              <div id="rewards">
                <ClaimRewards
                  pending={displayedPending}
                  wallet={publicKey?.toString() || null}
                  onClaim={handleClaim}
                />
              </div>

              <div id="attestations">
                <Attestations
                  onOpenDocument={() => setDocumentOpen(true)}
                  landControlVerified={landControlVerified}
                  wallet={publicKey?.toString() || null}
                  onRewardEarned={handleRewardEarned}
                />
              </div>

              <RewardChart history={displayedHistory} total={displayedTotal} />
            </div>

            {/* RIGHT PANEL: Project, Timeline, Weather, Docs */}
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

              <div className="project-docs">
                <div className="docs-header">
                  <span className="docs-title">PROJECT DOCUMENTS</span>
                </div>
                <div className="docs-list">
                  <div className="doc-item">
                    <span className="doc-icon">📄</span>
                    <div className="doc-info">
                      <span className="doc-name">Land Control Agreement</span>
                      <span className="doc-date">Apr 11, 2025</span>
                    </div>
                    <span className="doc-status verified">✓</span>
                  </div>
                  <div className="doc-item">
                    <span className="doc-icon">📄</span>
                    <div className="doc-info">
                      <span className="doc-name">Interconnection Application</span>
                      <span className="doc-date">Pending</span>
                    </div>
                    <span className="doc-status pending">○</span>
                  </div>
                  <div className="doc-item">
                    <span className="doc-icon">📄</span>
                    <div className="doc-info">
                      <span className="doc-name">Engineering Study</span>
                      <span className="doc-date">Locked</span>
                    </div>
                    <span className="doc-status locked">🔒</span>
                  </div>
                </div>
              </div>
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