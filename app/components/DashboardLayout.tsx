'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { usePrivy } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showConnectPrompt?: boolean;
}

export default function DashboardLayout({ children, showConnectPrompt = true }: DashboardLayoutProps) {
  // External wallet adapter (Phantom, Solflare)
  const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
  const { setVisible } = useWalletModal();
  
  // Privy (email/social login)
  const { login, logout, authenticated: privyAuthenticated, user: privyUser } = usePrivy();
  
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);

  // Unified connection state
  const connected = adapterConnected || privyAuthenticated;
  const publicKey = adapterPublicKey;

  const handleCloseMenu = () => {
    setMenuClosing(true);
    setMenuOpen(false);
    setTimeout(() => setMenuClosing(false), 300);
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const isActive = (path: string) => pathname === path;

  const handleDisconnect = async () => {
    if (privyAuthenticated) {
      await logout();
    }
  };

  // Navigation items in optimal order
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/mint', label: 'Mint License' },
    { path: '/licenses', label: 'My Licenses' },
    { path: '/leaderboard', label: 'Leaderboard' },
  ];

  const externalLinks = [
    { href: '/', label: 'Home', external: false },
    { href: '/litepaper', label: 'Litepaper', external: false },
  ];

  // Connect prompt for pages that require wallet
  if (!connected && showConnectPrompt) {
    return (
      <div className="dashboard-container">
        <div className="grid-floor"></div>
        <div className="connect-prompt">
          <div className="connect-box">
            <div className="logo">RE<span>DEW</span></div>
            <h1>VALIDATOR DASHBOARD</h1>
            <p>Connect your wallet to access the validator network</p>
            
            <div className="auth-buttons">
              <button className="connect-btn" onClick={() => setVisible(true)}>
                Connect Wallet
              </button>
              <button className="connect-btn secondary" onClick={() => login()}>
                Email / Social
              </button>
            </div>
            
            <div className="auth-divider">
              <span>Supported wallets</span>
            </div>
            <div className="wallet-icons">
              <span className="wallet-icon">Phantom</span>
              <span className="wallet-icon">Solflare</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!menuOpen && !menuClosing && (
        <button className="menu-burger" onClick={() => setMenuOpen(true)}>
          ☰
        </button>
      )}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <button className="menu-close" onClick={handleCloseMenu}>
          ✕
        </button>
        <Link href="/dashboard" className="logo" onClick={handleCloseMenu}>
          RE<span>DEW</span>
        </Link>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={handleCloseMenu}
            >
              {item.label}
            </Link>
          ))}
          
          <div className="nav-divider"></div>
          
          {externalLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-link"
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              onClick={handleCloseMenu}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="wallet-info">
          <div className="wallet-label">
            {privyAuthenticated && !adapterConnected 
              ? (privyUser?.email?.address ? 'Email' : 'Logged In') 
              : 'Connected'}
          </div>
          <div className="wallet-address">
            {publicKey 
              ? shortenAddress(publicKey.toString()) 
              : privyUser?.email?.address 
                ? privyUser.email.address.slice(0, 16) + '...'
                : ''}
          </div>
          {privyAuthenticated && (
            <button className="disconnect-btn" onClick={handleDisconnect}>
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {menuOpen && <div className="menu-overlay" onClick={handleCloseMenu}></div>}

      {children}
    </>
  );
}