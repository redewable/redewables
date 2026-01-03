'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePrivy } from '@privy-io/react-auth';
import './licenses.css';
import DashboardLayout from '../components/DashboardLayout';

interface DBLicense {
  id: string;
  nft_address: string;
  tier: 'genesis' | 'core' | 'surge' | string;
  minted_at: string;
  serial_number?: number | null;
}

const tierLabels: Record<string, string> = {
  genesis: 'Genesis License',
  core: 'Core License',
  surge: 'Surge License',
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

const tierSupply: Record<string, number> = {
  genesis: 1000,
  core: 1000,
  surge: 500,
};

const tierArt: Record<string, string> = {
  genesis: '/nft/ChatGenesis.png',
  core: '/nft/ChatCore.png',
  surge: '/nft/ChatSurge.png',
};

function shortenAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function shortenToken(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

// fallback deterministic serial if DB serial_number not present yet
function serialFallback(mint: string, supply: number) {
  if (!mint) return 1;
  const tail = mint.slice(-6);
  const n = parseInt(tail.replace(/[^0-9a-fA-F]/g, '').slice(-6) || '0', 16);
  return (n % supply) + 1; // 1..supply
}

type FlipState = { id: string; dir: 'left' | 'right' } | null;
type ClickFX = { id: string; dir: 'left' | 'right' } | null;
type TierFilter = 'all' | 'genesis' | 'core' | 'surge';

export default function LicensesPage() {
  // External wallet adapter
  const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
  
  // Privy (email/social login - for auth display only)
  const { authenticated: privyAuthenticated } = usePrivy();
  
  // Unified wallet state - external wallet required for transactions
  const connected = adapterConnected || privyAuthenticated;
  const publicKey = adapterPublicKey;
  
  const walletStr = useMemo(() => publicKey?.toString() || null, [publicKey]);

  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [flipped, setFlipped] = useState<FlipState>(null);
  const [clickFX, setClickFX] = useState<ClickFX>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  useEffect(() => {
    const fetchLicenses = async () => {
      if (!walletStr) {
        setLicenses([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/licenses?wallet=${walletStr}`);
        const data = await res.json();

        const formatted = (data.licenses || []).map((lic: DBLicense) => {
          const dbTier = (lic.tier || 'genesis') as 'genesis' | 'core' | 'surge';
          const supply = tierSupply[dbTier] || 1000;

          const serial =
            typeof lic.serial_number === 'number' && lic.serial_number > 0
              ? lic.serial_number
              : serialFallback(lic.nft_address, supply);

          const isOnePercentClub = serial <= Math.ceil(supply * 0.01);

          return {
            id: lic.id,
            dbTier,
            name: tierLabels[dbTier] || 'License',
            mintDate: new Date(lic.minted_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            tokenIdShort: shortenToken(lic.nft_address),
            nftAddress: lic.nft_address,
            artSrc: tierArt[dbTier] || '/nft/ChatGenesis.png',

            serial,
            supply,
            isOnePercentClub,

            multiplier: tierMultipliers[dbTier] || '1.0x',
            mintPrice: tierPrices[dbTier] || '—',
          };
        });

        setLicenses(formatted);
      } catch (e) {
        console.error('Failed to fetch licenses:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchLicenses();
  }, [walletStr]);

  const filteredLicenses = useMemo(() => {
    if (tierFilter === 'all') return licenses;
    return licenses.filter((l) => l.dbTier === tierFilter);
  }, [licenses, tierFilter]);

  // Tilt: apply to inner element so transforms don't fight
  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const card = e.currentTarget;
    const inner = card.querySelector<HTMLElement>('.license-card-inner');
    if (!inner) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const midX = rect.width / 2;
    const midY = rect.height / 2;

    const maxRotate = 7;
    const ry = ((x - midX) / midX) * maxRotate;
    const rx = -((y - midY) / midY) * maxRotate;

    inner.style.setProperty('--rx', `${rx}deg`);
    inner.style.setProperty('--ry', `${ry}deg`);
  };

  const handleTiltLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const inner = card.querySelector<HTMLElement>('.license-card-inner');
    if (!inner) return;

    inner.style.setProperty('--rx', `0deg`);
    inner.style.setProperty('--ry', `0deg`);
  };

  const triggerEdgeFX = (id: string, dir: 'left' | 'right') => {
    setClickFX({ id, dir });
    window.setTimeout(() => setClickFX(null), 140);
  };

  const requestFlip = (id: string, dir: 'left' | 'right') => {
    triggerEdgeFX(id, dir);

    // micro-delay flip to feel intentional
    window.setTimeout(() => {
      setFlipped((prev) => (prev?.id === id ? null : { id, dir }));
    }, 80);
  };

  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="testnet-banner">⚠️ DEVNET MODE — Real Wallet, Test Network</div>
        <div className="grid-floor"></div>

        <main className="main-content" style={{ maxWidth: 1200 }}>
          <div className="page-header">
            <h1 className="page-title">My Licenses</h1>
            <p className="page-subtitle">Tap a card to flip. Esc flips back.</p>
          </div>

          <div className="licenses-toolbar">
            <div className="licenses-wallet">
              <span className="wallet-pill-label">Wallet</span>
              <span className="wallet-pill">{publicKey ? shortenAddress(publicKey.toString()) : ''}</span>
            </div>

            <div className="licenses-filters">
              <button
                type="button"
                className={`filter-chip ${tierFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTierFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-chip ${tierFilter === 'genesis' ? 'active' : ''}`}
                onClick={() => setTierFilter('genesis')}
              >
                Genesis
              </button>
              <button
                type="button"
                className={`filter-chip ${tierFilter === 'core' ? 'active' : ''}`}
                onClick={() => setTierFilter('core')}
              >
                Core
              </button>
              <button
                type="button"
                className={`filter-chip ${tierFilter === 'surge' ? 'active' : ''}`}
                onClick={() => setTierFilter('surge')}
              >
                Surge
              </button>
            </div>
          </div>

        {loading ? (
          <div className="loading-licenses">Loading licenses...</div>
        ) : filteredLicenses.length === 0 ? (
          <div className="empty-licenses">
            <p>No licenses found</p>
            <a href="/mint" className="mint-link">
              Mint Your First License →
            </a>
          </div>
        ) : (
          <div className="licenses-grid">
            {filteredLicenses.map((lic: any) => {
              const isFlipped = flipped?.id === lic.id;
              const flipDir = isFlipped ? flipped?.dir : 'right';
              const showFX = clickFX && clickFX.id === lic.id ? clickFX.dir : null;

              const solscanUrl = lic.nftAddress
                ? `https://solscan.io/token/${lic.nftAddress}?cluster=devnet`
                : '#';

              const magicEdenUrl = lic.nftAddress
                ? `https://magiceden.io/item-details/${lic.nftAddress}?cluster=devnet`
                : '#';

              const className =
                `license-flip-card tier-${lic.dbTier} ` +
                (isFlipped ? 'is-flipped ' : '') +
                (flipDir === 'left' ? 'flip-left ' : 'flip-right ') +
                (lic.isOnePercentClub ? 'club-one ' : '') +
                (showFX === 'left' ? 'edge-left ' : '') +
                (showFX === 'right' ? 'edge-right ' : '');

              return (
                <div
                  key={lic.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isFlipped}
                  className={className}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;

                    // If click originated inside a link/button, don't flip
                    if (target.closest('a, button')) return;

                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;

                    const dir =
                      window.matchMedia('(pointer: coarse)').matches
                        ? 'right'
                        : clickX < rect.width / 2
                          ? 'left'
                          : 'right';

                    requestFlip(lic.id, dir);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      if (isFlipped) setFlipped(null);
                      return;
                    }
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      requestFlip(lic.id, 'right');
                    }
                  }}
                  onMouseMove={handleTiltMove}
                  onMouseLeave={handleTiltLeave}
                  aria-label={`${lic.name}. Press Enter to flip. Press Escape to close.`}
                >
                  <div className="license-card-inner">
                    {/* FRONT */}
                    <div className="license-card-face front">
                      <div className="nft-art-frame">
                        <div className="nft-art-glow" />
                        {lic.isOnePercentClub && <div className="glint-sweep" />}

                        <Image
                          src={lic.artSrc}
                          alt={lic.name}
                          width={900}
                          height={1200}
                          className="nft-art-img"
                          priority
                        />

                        {/* Engraved serial (no background) */}
                        <div
                          className="serial-engrave"
                          aria-label={`Serial ${lic.serial} of ${lic.supply}`}
                        >
                          <div className="serial-etch-line" />
                          <span className="serial-text">
                            {lic.serial} / {lic.supply}
                          </span>
                        </div>

                        {lic.isOnePercentClub && <div className="club-corner" />}
                      </div>

                      <div className="front-meta">
                        <div className="front-title">{lic.name}</div>
                        <div className="front-sub mono">{lic.tokenIdShort}</div>
                      </div>

                      <div className="front-footer">
                        <span className="front-hint">Flip</span>
                        <span className="front-hint-icon">↻</span>
                      </div>
                    </div>

                    {/* BACK */}
                    <div className="license-card-face back">
                      <div className="back-top">
                        <div>
                          <div className="back-title">{lic.name}</div>
                          <div className="back-sub mono">{lic.tokenIdShort}</div>
                        </div>
                        <div className="edition-pill">
                          {lic.serial} / {lic.supply}
                        </div>
                      </div>

                      <div className="back-divider" />

                      <div className="back-spec">
                        <div className="spec-row">
                          <span className="spec-k">Minted</span>
                          <span className="spec-v">{lic.mintDate}</span>
                        </div>
                        <div className="spec-row">
                          <span className="spec-k">Multiplier</span>
                          <span className="spec-v mono">{lic.multiplier}</span>
                        </div>
                        <div className="spec-row">
                          <span className="spec-k">Mint Price</span>
                          <span className="spec-v mono">{lic.mintPrice}</span>
                        </div>
                        <div className="spec-row">
                          <span className="spec-k">Access</span>
                          <span className="spec-v">All Projects</span>
                        </div>
                      </div>

                      <div className="back-divider" />

                      <div className="back-links">
                        <a
                          className="back-link-btn"
                          href={solscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Solscan ↗
                        </a>

                        <a
                          className="back-link-btn"
                          href={magicEdenUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Magic Eden ↗
                        </a>
                      </div>

                      <div className="front-footer">
                        <span className="front-hint">Back</span>
                        <span className="front-hint-icon">↺</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
    </DashboardLayout>
  );
}