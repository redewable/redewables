'use client';

import Image from 'next/image';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: {
    tier: string;
    name: string;
    mintDate: string;
    tokenId: string;
    nftAddress?: string;
    attributes: { trait: string; value: string }[];
    dbTier?: string;
  } | null;
}

const tierArt: Record<string, string> = {
  genesis: '/nft/ChatGenesis.png',
  core: '/nft/ChatCore.png',
  surge: '/nft/ChatSurge.png',
};

export default function LicenseModal({ isOpen, onClose, license }: LicenseModalProps) {
  if (!isOpen || !license) return null;

  const solscanUrl = license.nftAddress
    ? `https://solscan.io/token/${license.nftAddress}?cluster=devnet`
    : '#';

  const magicEdenUrl = license.nftAddress
    ? `https://magiceden.io/item-details/${license.nftAddress}?cluster=devnet`
    : '#';

  const artSrc =
    tierArt[license.dbTier || 'genesis'] || '/nft/ChatGenesis.png';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`license-modal tier-${license.dbTier}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{license.name}</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="license-modal-content">
          {/* NFT ART PREVIEW */}
          <div className="license-preview nft-modal-frame">
            <div className="nft-modal-glow" />
            <Image
              src={artSrc}
              alt={license.name}
              width={720}
              height={720}
              className="nft-modal-img"
              priority
            />
            <div className="nft-modal-tier">{license.tier}</div>
          </div>

          {/* METADATA */}
          <div className="license-metadata">
            <div className="metadata-section">
              <div className="metadata-title">TOKEN INFO</div>

              <div className="metadata-row">
                <span className="metadata-label">Token ID</span>
                <span className="metadata-value mono">{license.tokenId}</span>
              </div>

              <div className="metadata-row">
                <span className="metadata-label">Mint Date</span>
                <span className="metadata-value">{license.mintDate}</span>
              </div>

              <div className="metadata-row">
                <span className="metadata-label">Collection</span>
                <span className="metadata-value">ReDew Validators</span>
              </div>

              <div className="metadata-row">
                <span className="metadata-label">Standard</span>
                <span className="metadata-value">Metaplex Core</span>
              </div>
            </div>

            <div className="metadata-section">
              <div className="metadata-title">ATTRIBUTES</div>
              {license.attributes.map((attr, index) => (
                <div key={index} className="metadata-row">
                  <span className="metadata-label">{attr.trait}</span>
                  <span className="metadata-value">{attr.value}</span>
                </div>
              ))}
            </div>

            <div className="metadata-section">
              <div className="metadata-title">LINKS</div>
              <div className="license-links">
                <a href={solscanUrl} target="_blank" rel="noopener noreferrer" className="license-link">
                  View on Solscan ↗
                </a>
                <a href={magicEdenUrl} target="_blank" rel="noopener noreferrer" className="license-link">
                  View on Magic Eden ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}