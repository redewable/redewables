'use client';

import { useState } from 'react';
import Weather from '../components/Weather';
import Attestations from '../components/Attestations';
import RewardChart from '../components/RewardChart';
import ProjectTimeline from '../components/ProjectTimeline';
import ClaimRewards from '../components/ClaimRewards';



export default function Dashboard() {
  const [pendingRewards, setPendingRewards] = useState(1247);
  const [totalEarned, setTotalEarned] = useState(2525);
  const [rewardHistory, setRewardHistory] = useState([
    { month: 'Jul', amount: 320 },
    { month: 'Aug', amount: 480 },
    { month: 'Sep', amount: 290 },
    { month: 'Oct', amount: 610 },
    { month: 'Nov', amount: 825 },
    { month: 'Dec', amount: 0 },
  ]);

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

  return (
    <div className="dashboard-container">
      <div className="testnet-banner">⚠️ TESTNET MODE — Mock Data</div>
      <div className="grid-floor"></div>
      
      <aside className="sidebar">
        <div className="logo">RE<span>DEW</span></div>
        
        <nav className="nav">
          <a href="/dashboard" className="nav-link active">Dashboard</a>
          <a href="/mint" className="nav-link">Mint License</a>
          <a href="#" className="nav-link">Attestations</a>
          <a href="#" className="nav-link">Rewards</a>
        </nav>

        <div className="wallet-info">
          <div className="wallet-label">Connected</div>
          <div className="wallet-address">7xK9...3mPq</div>
        </div>
      </aside>

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
            <div className="stat-value">{pendingRewards.toLocaleString()} <span>$RDW</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Earned</div>
            <div className="stat-value">{totalEarned.toLocaleString()} <span>$RDW</span></div>
          </div>
        </div>

        <div className="content-grid">
          <div className="panel">
            <h2 className="panel-title">My Licenses</h2>
            <div className="license-list">
              <div className="license-card">
                <div className="license-icon">G</div>
                <div>
                  <div className="license-name">Genesis License</div>
                  <div className="license-meta">Tier 1 • Minted Dec 2025</div>
                </div>
              </div>
              <div className="license-card">
                <div className="license-icon">C</div>
                <div>
                  <div className="license-name">Core License</div>
                  <div className="license-meta">Tier 2 • Minted Dec 2025</div>
                </div>
              </div>
            </div>
            <Attestations />
            <RewardChart history={rewardHistory} total={totalEarned} />
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
            <ClaimRewards 
              pending={pendingRewards} 
              onClaim={handleClaim} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}