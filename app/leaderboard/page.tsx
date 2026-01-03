'use client';

import './leaderboard.css';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import DashboardLayout from '../components/DashboardLayout';

interface Leader {
  wallet_address: string;
  total_nodes: number;
  power: number;
}

export default function LeaderboardPage() {
  // External wallet adapter
  const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
  const { setVisible } = useWalletModal();
  
  // Privy (email/social login - for auth display only)
  const { authenticated: privyAuthenticated } = usePrivy();
  
  // Unified wallet state - external wallet required for transactions
  const connected = adapterConnected || privyAuthenticated;
  const publicKey = adapterPublicKey;
  
  const [allLeaders, setAllLeaders] = useState<Leader[]>([]);
  const [filteredLeaders, setFilteredLeaders] = useState<Leader[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log('[Leaderboard] Supabase config:', { url: !!url, key: !!key });
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  useEffect(() => {
    async function fetchLeaders() {
      if (!supabase) {
        console.log('[Leaderboard] No supabase client');
        setLoading(false);
        return;
      }

      try {
        console.log('[Leaderboard] Fetching licenses...');
        const { data, error } = await supabase
          .from('licenses')
          .select('wallet_address, tier')
          .eq('mint_status', 'minted');

        console.log('[Leaderboard] Query result:', { data, error });

        if (error) throw error;

        const grouping = (data || []).reduce((acc: any, curr: any) => {
          const addr = curr.wallet_address;
          const tier = curr.tier?.toLowerCase();
          const multiplier =
            tier === 'surge' ? 2.0 : tier === 'genesis' ? 1.5 : 1.0;

          if (!acc[addr]) acc[addr] = { wallet_address: addr, total_nodes: 0, power: 0 };
          acc[addr].total_nodes += 1;
          acc[addr].power += multiplier;
          return acc;
        }, {});

        const sorted = Object.values(grouping).sort((a: any, b: any) => b.power - a.power) as Leader[];
        console.log('[Leaderboard] Sorted leaders:', sorted);
        setAllLeaders(sorted);
        setFilteredLeaders(sorted);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    }

    // Fetch leaderboard data regardless of wallet connection (public data)
    fetchLeaders();
  }, [supabase]);

  useEffect(() => {
    const filtered = allLeaders.filter((l) =>
      l.wallet_address.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLeaders(filtered);
  }, [searchTerm, allLeaders]);

  const shorten = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const getRankClass = (index: number) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  };

  return (
    <DashboardLayout>
      <div className="leaderboard-container">
          <div className="testnet-banner">⚠️ DEVNET MODE — Real Wallet, Test Network</div>
          <div className="grid-floor"></div>

          <div className="leaderboard-content">
            <div className="leaderboard-header">
              <div className="leaderboard-title-row">
                <div>
                  <h1 className="leaderboard-title">Network Rankings</h1>
                  <p className="leaderboard-subtitle">Global validator standings • Rolling 24h</p>
                </div>
                <div className="live-indicator">
                  <div className="live-dot"></div>
                  <span className="live-text">Live</span>
                </div>
              </div>
              
              <div className="validator-id">
                Your Validator: <span>{publicKey ? shorten(publicKey.toString()) : '—'}</span>
              </div>
            </div>

            <div className="leaderboard-panel">
              <div className="leaderboard-search">
              <span className="leaderboard-search-icon">🔍</span>
              <input
                type="text"
                value={searchTerm}
                placeholder="Search validator..."
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="leaderboard-list">
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton-row">
                      <div className="skeleton skeleton-avatar" />
                      <div className="skeleton-lines">
                        <div className="skeleton skeleton-text" style={{ width: '120px' }} />
                        <div className="skeleton skeleton-text short" style={{ width: '60px' }} />
                      </div>
                    </div>
                  ))}
                </>
              ) : filteredLeaders.length > 0 ? (
                filteredLeaders.map((leader, index) => (
                  <div 
                    key={leader.wallet_address} 
                    className={`leader-row ${index < 3 ? 'top-3' : ''}`}
                  >
                    <div className="leader-left">
                      <div className={`leader-rank ${getRankClass(index)}`}>
                        {index + 1}
                      </div>
                      <div className="leader-info">
                        <div className="leader-wallet">{shorten(leader.wallet_address)}</div>
                        <div className="leader-nodes">{leader.total_nodes} Node{leader.total_nodes !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="leader-right">
                      <div className="leader-power">{leader.power.toFixed(1)}x</div>
                      <div className="leader-power-label">Power</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="leaderboard-empty">No validators found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}