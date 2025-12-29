'use client';

import { useState, useEffect } from 'react';
import Weather from '../components/Weather';
import Attestations from '../components/Attestations';
import RewardChart from '../components/RewardChart';
import ProjectTimeline from '../components/ProjectTimeline';
import ClaimRewards from '../components/ClaimRewards';
import DocumentModal from '../components/DocumentModal';
import CountdownTimer from '../components/CountdownTimer';
import LicenseModal from '../components/LicenseModal';

const licenses = [
  {
    tier: 'G',
    name: 'Genesis License',
    mintDate: 'Dec 15, 2025',
    tokenId: '7xK9...3mPq',
    attributes: [
      { trait: 'Tier', value: 'Genesis' },
      { trait: 'Mint Price', value: '2.5 SOL' },
      { trait: 'Reward Multiplier', value: '1.5x' },
      { trait: 'Project Access', value: 'All Projects' },
    ],
  },
  {
    tier: 'C',
    name: 'Core License',
    mintDate: 'Dec 18, 2025',
    tokenId: '9aB2...7kLm',
    attributes: [
      { trait: 'Tier', value: 'Core' },
      { trait: 'Mint Price', value: '3.5 SOL' },
      { trait: 'Reward Multiplier', value: '1.0x' },
      { trait: 'Project Access', value: 'All Projects' },
    ],
  },
];

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [pendingRewards, setPendingRewards] = useState(1247);
  const [displayedPending, setDisplayedPending] = useState(1247);
  const [totalEarned, setTotalEarned] = useState(2525);
  const [displayedTotal, setDisplayedTotal] = useState(2525);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [landControlVerified, setLandControlVerified] = useState(false);
  const [pendingAnimating, setPendingAnimating] = useState(false);
  const [totalAnimating, setTotalAnimating] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<typeof licenses[0] | null>(null);
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

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setMenuClosing(true);
    setTimeout(() => setMenuClosing(false), 300);
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

  return (
    <div className="dashboard-container">
      <div className="testnet-banner">⚠️ TESTNET MODE — Mock Data</div>
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
          <div className="wallet-address">7xK9...3mPq</div>
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
            <div className="stat-value">2</div>
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
              {licenses.map((license, index) => (
                <div 
                  key={index} 
                  className="license-card clickable"
                  onClick={() => setSelectedLicense(license)}
                >
                  <div className="license-icon">{license.tier}</div>
                  <div>
                    <div className="license-name">{license.name}</div>
                    <div className="license-meta">Tier {index + 1} • Minted Dec 2025</div>
                  </div>
                </div>
              ))}
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
  );
}