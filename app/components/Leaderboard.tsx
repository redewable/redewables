'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Leader {
  wallet_address: string;
  total_nodes: number;
  power: number;
}

function getEnv(name: string): string | null {
  const v = (process.env as any)[name] as string | undefined;
  return v && v.trim().length > 0 ? v : null;
}

export default function Leaderboard() {
  const [allLeaders, setAllLeaders] = useState<Leader[]>([]);
  const [filteredLeaders, setFilteredLeaders] = useState<Leader[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => {
    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  useEffect(() => {
    async function fetchLeaders() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('wallet_address, tier')
          .eq('mint_status', 'minted');

        if (error) throw error;

        const grouping = (data || []).reduce((acc: any, curr: any) => {
          const addr = curr.wallet_address;
          const multiplier =
            curr.tier === 'surge' ? 2.0 : curr.tier === 'genesis' ? 1.5 : 1.0;

          if (!acc[addr]) acc[addr] = { wallet_address: addr, total_nodes: 0, power: 0 };
          acc[addr].total_nodes += 1;
          acc[addr].power += multiplier;
          return acc;
        }, {});

        const sorted = Object.values(grouping).sort((a: any, b: any) => b.power - a.power) as Leader[];
        setAllLeaders(sorted);
        setFilteredLeaders(sorted);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaders();
  }, [supabase]);

  useEffect(() => {
    const filtered = allLeaders.filter((l) =>
      l.wallet_address.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLeaders(filtered);
  }, [searchTerm, allLeaders]);

  const shorten = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          placeholder="SEARCH VALIDATOR"
          onChange={(e) => setSearchTerm(e.target.value)}
          className="
            w-full bg-black/35 border border-white/10 rounded-xl
            px-10 py-3 text-[10px] font-mono tracking-[0.22em]
            text-emerald-200/90 placeholder:text-gray-700 uppercase
            focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20
            transition-all
          "
        />
        <div className="absolute left-4 top-3.5 text-gray-700">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
        {loading ? (
          <div className="text-center py-10 text-[10px] font-mono text-gray-600 animate-pulse tracking-[0.22em] uppercase">
            Synchronizing…
          </div>
        ) : filteredLeaders.length > 0 ? (
          filteredLeaders.map((leader, index) => {
            const isTop3 = index < 3;
            return (
              <div
                key={leader.wallet_address}
                className="
                  group flex items-center justify-between px-4 py-4 rounded-xl
                  bg-white/[0.02] border border-white/[0.06]
                  hover:bg-white/[0.04] hover:border-emerald-500/20
                  transition-all
                "
              >
                <div className="flex items-center gap-4">
                  <span
                    className={[
                      'text-[10px] font-mono font-black w-7 h-7 flex items-center justify-center rounded-lg bg-black/40 border',
                      isTop3 ? 'border-emerald-500/40 text-emerald-300' : 'border-white/10 text-gray-500',
                    ].join(' ')}
                  >
                    {index + 1}
                  </span>

                  <div>
                    <div className="text-[11px] font-mono text-gray-300 group-hover:text-white transition-colors uppercase">
                      {shorten(leader.wallet_address)}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.18em]">
                      {leader.total_nodes} Nodes
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-emerald-400">
                    {leader.power.toFixed(1)}x
                  </div>
                  <div className="text-[8px] text-gray-700 font-mono uppercase tracking-[0.22em]">
                    Power
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-[10px] font-mono text-gray-700 uppercase tracking-[0.22em]">
            Empty Set
          </div>
        )}
      </div>
    </div>
  );
}