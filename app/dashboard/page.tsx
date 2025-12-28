export default function Dashboard() {
  return (
    <div className="dashboard-container">
        <div className="testnet-banner">⚠️ TESTNET MODE — Mock Data</div>
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
            <div className="stat-value">1,247 <span>$RDW</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Attestations</div>
            <div className="stat-value">12/15</div>
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
              <div className="project-status-list">
                <div className="status-row">
                  <span className="status-label">Land Control</span>
                  <span className="status-value green">✓ Secured</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Interconnection</span>
                  <span className="status-value yellow">Pre-Filing</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Engineering</span>
                  <span className="status-value yellow">In Progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}