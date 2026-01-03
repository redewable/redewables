'use client';

import { useEffect, useState } from 'react';
import { useWallets } from '@privy-io/react-auth/solana';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';
import { publicKey } from '@metaplex-foundation/umi';

const DEVNET_RPC = 'https://api.devnet.solana.com';

interface LicenseNFT {
  address: string;
  name: string;
  uri: string;
  image?: string;
  tier?: string;
}

interface Props {
  onLicensesLoaded?: (multiplier: number, count: number) => void;
}

export default function LicenseGallery({ onLicensesLoaded }: Props) {
  const { wallets } = useWallets();
  const [licenses, setLicenses] = useState<LicenseNFT[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getLicenses = async () => {
      const solanaWallet = wallets[0];
      if (!solanaWallet) return;

      setLoading(true);
      try {
        const umi = createUmi(DEVNET_RPC).use(mplCore());
        const ownerPublicKey = publicKey(solanaWallet.address);
        const assets = await fetchAssetsByOwner(umi, ownerPublicKey);

        const formattedLicenses = await Promise.all(
          assets.map(async (asset) => {
            const response = await fetch(asset.uri);
            const metadata = await response.json();
            return {
              address: asset.publicKey.toString(),
              name: asset.name,
              uri: asset.uri,
              image: metadata.image,
              tier: metadata.attributes?.find((a: any) => a.trait_type === 'Tier')?.value
            };
          })
        );

        setLicenses(formattedLicenses);

        // Calculate stats for the dashboard
        if (onLicensesLoaded) {
          const totalMultiplier = formattedLicenses.reduce((acc, nft) => {
            const val = parseFloat(nft.tier?.replace('x', '') || '0');
            return acc + (isNaN(val) ? 0 : val);
          }, 0);
          onLicensesLoaded(totalMultiplier, formattedLicenses.length);
        }
      } catch (err) {
        console.error("Failed to fetch licenses:", err);
      } finally {
        setLoading(false);
      }
    };

    getLicenses();
  }, [wallets, onLicensesLoaded]);

  if (loading) return <div className="text-indigo-400 animate-pulse font-mono text-sm">SCANNING BLOCKCHAIN...</div>;
  if (licenses.length === 0) return <div className="text-gray-600 italic py-10 text-center border border-dashed border-gray-800 rounded-2xl">No validator licenses detected in this wallet.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {licenses.map((nft) => (
        <div key={nft.address} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 hover:border-indigo-500/50 transition-all group">
          {nft.image && (
            <img src={nft.image} alt={nft.name} className="w-full h-40 object-cover rounded-xl mb-4 grayscale group-hover:grayscale-0 transition-all" />
          )}
          <h3 className="text-md font-bold text-white tracking-tight">{nft.name}</h3>
          <p className="text-emerald-400 text-xs font-mono mt-1">{nft.tier} Multiplier</p>
          <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500 font-mono">
            <span>{nft.address.slice(0, 4)}...{nft.address.slice(-4)}</span>
            <a href={`https://explorer.solana.com/address/${nft.address}?cluster=devnet`} target="_blank" className="text-indigo-400 hover:text-white transition-colors">EXPLORER ↗</a>
          </div>
        </div>
      ))}
    </div>
  );
}