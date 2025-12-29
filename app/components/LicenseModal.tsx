'use client';

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
  } | null;
}

export default function LicenseModal({ isOpen, onClose, license }: LicenseModalProps) {
  if (!isOpen || !license) return null;

  const solscanUrl = license.nftAddress 
    ? `https://solscan.io/token/${license.nftAddress}?cluster=devnet`
    : '#';
  
  const magicEdenUrl = license.nftAddress
    ? `https://magiceden.io/item-details/${license.nftAddress}?cluster=devnet`
    : '#';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="license-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{license.name}</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="license-modal-content">
          <div className="license-preview">
            <div className="license-preview-icon">{license.tier}</div>
          </div>

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
                <a href={solscanUrl} target="_blank" rel="noopener noreferrer" className="license-link">View on Solscan ↗</a>
                <a href={magicEdenUrl} target="_blank" rel="noopener noreferrer" className="license-link">View on Magic Eden ↗</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}