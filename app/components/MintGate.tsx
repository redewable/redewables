'use client';

import Link from 'next/link';

interface MintGateProps {
  children: React.ReactNode;
  hasLicense: boolean;
  loading?: boolean;
}

export default function MintGate({ children, hasLicense, loading }: MintGateProps) {
  if (loading) {
    return (
      <div className="mint-gate">
        <div className="mint-gate-content">
          <div className="mint-gate-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="mint-gate-title">CHECKING LICENSE...</h2>
        </div>
      </div>
    );
  }

  if (!hasLicense) {
    return (
      <div className="mint-gate">
        <div className="mint-gate-content">
          <div className="mint-gate-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="mint-gate-title">LICENSE REQUIRED</h2>
          <p className="mint-gate-text">
            You need to own a ReDew Validator License to access the dashboard and start earning rewards.
          </p>
          <Link href="/mint" className="mint-gate-btn">
            Mint Your License →
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}