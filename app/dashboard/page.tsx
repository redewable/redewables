'use client';

import '../dashboard.css';
import '../modals.css';
import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import Weather from '../components/Weather';
import Attestations from '../components/Attestations';
import RewardChart from '../components/RewardChart';
import ProjectTimeline from '../components/ProjectTimeline';
import ClaimRewards from '../components/ClaimRewards';
import DocumentModal from '../components/DocumentModal';
import LicenseModal from '../components/LicenseModal';
import MintGate from '../components/MintGate';
import DashboardLayout from '../components/DashboardLayout';
import Link from 'next/link';

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
  // External wallet adapter
  const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
  const { setVisible } = useWalletModal();
  
  // Privy (email/social login - for auth display only)
  const { authenticated: privyAuthenticated } = usePrivy();
  
  // Unified wallet state - external wallet required for transactions
  const connected = adapterConnected || privyAuthenticated;
  const publicKey = adapterPublicKey; // Only external wallets have signing capability

  // Supabase client
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  // Network stats state
  const [networkStats, setNetworkStats] = useState({
    totalValidators: 0,
    totalLicenses: 0,
    networkPower: 0,
    genesisMinted: 0,
    coreMinted: 0,
    surgeMinted: 0,
  });
  const [networkLoading, setNetworkLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPower, setUserPower] = useState(0);

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

  // Generate rolling 12 months (current month is last)
  const generateRolling12Months = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
      result.push({
        month: months[monthIndex],
        year,
        monthIndex,
        amount: 0,
        // Protocol launched Dec 2025 - months before that are inactive
        active: year > 2025 || (year === 2025 && monthIndex >= 11) // Dec 2025 or later
      });
    }
    return result;
  };

  // Memoize initial history to prevent regeneration on re-renders
  const [rewardHistory, setRewardHistory] = useState(() => generateRolling12Months());
  const [displayedHistory, setDisplayedHistory] = useState(() => generateRolling12Months());

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

  // Fetch network-wide stats
  useEffect(() => {
    async function fetchNetworkStats() {
      if (!supabase) {
        setNetworkLoading(false);
        return;
      }

      try {
        const { data: licenses, error } = await supabase
          .from('licenses')
          .select('wallet_address, tier')
          .eq('mint_status', 'minted');

        if (error) throw error;

        const walletPowers: Record<string, number> = {};
        let totalPower = 0;
        let genesis = 0, core = 0, surge = 0;

        (licenses || []).forEach((lic: any) => {
          const wallet = lic.wallet_address;
          const tier = lic.tier?.toLowerCase();
          let power = 0;
          
          if (tier === 'genesis') {
            genesis++;
            power = 1.5;
          } else if (tier === 'core') {
            core++;
            power = 1.0;
          } else if (tier === 'surge') {
            surge++;
            power = 2.0;
          }
          
          totalPower += power;
          walletPowers[wallet] = (walletPowers[wallet] || 0) + power;
        });

        // Sort wallets by power to find rank
        const sortedWallets = Object.entries(walletPowers)
          .sort(([, a], [, b]) => b - a);
        
        // Find current user's rank
        if (publicKey) {
          const userWallet = publicKey.toString();
          const rankIndex = sortedWallets.findIndex(([wallet]) => wallet === userWallet);
          if (rankIndex >= 0) {
            setUserRank(rankIndex + 1);
            setUserPower(walletPowers[userWallet] || 0);
          } else {
            setUserRank(null);
            setUserPower(0);
          }
        }

        setNetworkStats({
          totalValidators: Object.keys(walletPowers).length,
          totalLicenses: (licenses || []).length,
          networkPower: totalPower,
          genesisMinted: genesis,
          coreMinted: core,
          surgeMinted: surge,
        });
      } catch (err) {
        console.error('Error fetching network stats:', err);
      } finally {
        setNetworkLoading(false);
      }
    }

    fetchNetworkStats();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchNetworkStats, 60000);
    return () => clearInterval(interval);
  }, [supabase, publicKey]);

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
        // Put historical rewards in December 2025 (when protocol launched)
        // Find December 2025 index
        setRewardHistory(prev => {
          const updated = [...prev];
          const dec2025Idx = updated.findIndex(m => m.year === 2025 && m.monthIndex === 11);
          if (dec2025Idx >= 0) {
            updated[dec2025Idx] = { ...updated[dec2025Idx], amount: data.totalClaimed };
          }
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

  // Animation: History bars - sync displayedHistory to rewardHistory
  useEffect(() => {
    // Find any months with different amounts
    const changedIndices: number[] = [];
    rewardHistory.forEach((item, idx) => {
      if (displayedHistory[idx]?.amount !== item.amount) {
        changedIndices.push(idx);
      }
    });

    if (changedIndices.length === 0) return;

    const duration = 1200;
    const startTime = Date.now();
    const startValues = changedIndices.map(idx => displayedHistory[idx]?.amount || 0);
    const endValues = changedIndices.map(idx => rewardHistory[idx].amount);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayedHistory(prev => {
        const updated = [...prev];
        changedIndices.forEach((idx, i) => {
          const current = Math.round(startValues[i] + (endValues[i] - startValues[i]) * eased);
          updated[idx] = { ...updated[idx], amount: current };
        });
        return updated;
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [rewardHistory]);

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleClaim = () => {
    const claimed = pendingRewards;
    setPendingRewards(0);
    setTotalEarned(prev => prev + claimed);
    
    // Update RDW balance locally (for simulation mode where on-chain doesn't change)
    setRdwBalance(prev => prev + claimed);
    
    // Add to current month on chart
    setRewardHistory(prev => {
      const updated = [...prev];
      const currentIdx = updated.length - 1;
      updated[currentIdx] = { ...updated[currentIdx], amount: updated[currentIdx].amount + claimed };
      return updated;
    });

    // Refresh rewards from server (but not RDW balance - that's local in simulation mode)
    setTimeout(() => {
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

  // Connect prompt handled by DashboardLayout
  return (
    <DashboardLayout>
      <MintGate hasLicense={licenses.length > 0} loading={loadingLicenses}>
        <div className="dashboard-container">
          <div className="testnet-banner">⚠️ DEVNET MODE — Real Wallet, Test Network</div>
          <div className="grid-floor"></div>

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

          <div className="stats-grid stats-grid-all">
            {/* Desktop Row 1 */}
            <Link href="/licenses" className="stat-card stat-card-link stat-licenses-owned">
              <div className="stat-label">Licenses Owned</div>
              <div className="stat-value">
                {loadingLicenses ? <div className="skeleton skeleton-value" /> : licenses.length}
              </div>
            </Link>
            <div className="stat-card stat-rdw-balance">
              <div className="stat-label">$RDW Balance</div>
              <div className={`stat-value ${rdwAnimating ? 'animating' : ''}`}>
                {displayedRdwBalance.toLocaleString()} <span>$RDW</span>
              </div>
            </div>
            <div className="stat-card stat-total-earned">
              <div className="stat-label">Total Earned</div>
              <div className={`stat-value ${totalAnimating ? 'animating' : ''}`}>
                {displayedTotal.toLocaleString()} <span>$RDW</span>
              </div>
            </div>
            <Link href="/leaderboard" className="stat-card stat-card-link stat-network-validators">
              <div className="stat-label">Network Validators</div>
              <div className="stat-value">
                {networkLoading ? <div className="skeleton skeleton-value" /> : networkStats.totalValidators}
              </div>
            </Link>

            {/* Desktop Row 2 */}
            <div className="stat-card stat-tier-breakdown">
              <div className="stat-label">Your Tiers</div>
              <div className="stat-value" style={{ fontSize: '1rem' }}>
                {loadingLicenses ? <div className="skeleton skeleton-value" /> : (
                  <>
                    <span style={{ color: '#00FF9D' }}>{licenses.filter(l => l.dbTier === 'genesis').length}G</span>
                    {' / '}
                    <span style={{ color: '#C0C0C0' }}>{licenses.filter(l => l.dbTier === 'core').length}C</span>
                    {' / '}
                    <span style={{ color: '#00FFFF' }}>{licenses.filter(l => l.dbTier === 'surge').length}S</span>
                  </>
                )}
              </div>
            </div>
            <div className="stat-card stat-network-power">
              <div className="stat-label">Your Power</div>
              <div className="stat-value">
                {loadingLicenses ? <div className="skeleton skeleton-value" /> : (
                  <>
                    {licenses.reduce((sum, l) => {
                      if (l.dbTier === 'genesis') return sum + 1.5;
                      if (l.dbTier === 'core') return sum + 1.0;
                      if (l.dbTier === 'surge') return sum + 2.0;
                      return sum;
                    }, 0).toFixed(1)}<span>x</span>
                  </>
                )}
              </div>
            </div>
            <div className="stat-card stat-pending-rewards">
              <div className="stat-label">Pending Rewards</div>
              <div className={`stat-value ${pendingAnimating ? 'animating' : ''}`}>
                {displayedPending.toLocaleString()} <span>$RDW</span>
              </div>
            </div>
            <Link href="/mint" className="stat-card stat-card-link stat-licenses-minted">
              <div className="stat-label">Licenses Minted</div>
              <div className="stat-value">
                {networkLoading ? <div className="skeleton skeleton-value" /> : networkStats.totalLicenses}
              </div>
            </Link>
          </div>

          {/* Empty State - No Licenses */}
          {!loadingLicenses && licenses.length === 0 && (
            <div className="empty-state" style={{ marginBottom: '24px' }}>
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3 className="empty-state-title">No Licenses Yet</h3>
              <p className="empty-state-text">
                Mint a validator license to start earning $RDW rewards and participate in attestations.
              </p>
              <Link href="/mint" className="empty-state-btn">
                Mint Your First License →
              </Link>
            </div>
          )}

          <div className="content-grid">
            {/* LEFT PANEL: Rank, Pending Rewards, History, Attestations */}
            <div className="panel panel-left">
              <h2 className="panel-title">Rewards & Attestations</h2>
              
              {/* Your Rank Card - at top */}
              <Link href="/leaderboard" className="rank-card">
                <div className="rank-card-left">
                  <div className="rank-label">YOUR RANK</div>
                  <div className="rank-value">
                    {networkLoading ? '...' : userRank ? `#${userRank}` : '—'}
                  </div>
                </div>
                <div className="rank-card-right">
                  <div className="rank-power-label">Power</div>
                  <div className="rank-power-value">
                    {networkLoading ? '...' : `${userPower.toFixed(1)}x`}
                  </div>
                </div>
                <div className="rank-card-total">
                  of {networkStats.totalValidators} validators
                </div>
              </Link>

              <div id="rewards">
                <ClaimRewards
                  pending={displayedPending}
                  wallet={publicKey?.toString() || null}
                  onClaim={handleClaim}
                />
              </div>

              <RewardChart history={displayedHistory} total={displayedTotal} />

              <div id="attestations">
                <Attestations
                  onOpenDocument={() => setDocumentOpen(true)}
                  landControlVerified={landControlVerified}
                  wallet={publicKey?.toString() || null}
                  onRewardEarned={handleRewardEarned}
                />
              </div>
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
            <a href="https://redewable.com" target="_blank" rel="noopener">ReDewable.com</a>
            <a href="https://redewables.vercel.app/litepaper/index.html" target="_blank" rel="noopener">Litepaper</a>
            <a href="https://x.com/redewable" target="_blank" rel="noopener">𝕏 Twitter</a>
            <a href="https://discord.gg/redewable" target="_blank" rel="noopener">Discord</a>
            <a href="https://t.me/redewable" target="_blank" rel="noopener">Telegram</a>
          </div>
          <div className="footer-copy">© 2026 ReDewable Energy Company, LLC</div>
        </footer>
      </div>
    </MintGate>
    </DashboardLayout>
  );
}