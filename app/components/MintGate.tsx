'use client';

import { useState } from 'react';

interface MintGateProps {
  children: React.ReactNode;
}

export default function MintGate({ children }: MintGateProps) {
  const [hasLicense, setHasLicense] = useState(true);

  // Demo toggle - remove in production
  const demoToggle = (
    <button 
      className="demo-toggle"
      onClick={() => setHasLicense(!hasLicense)}
    >
      Demo: {hasLicense ? 'Has License ✓' : 'No License ✗'}
    </button>
  );

  if (!hasLicense) {
    return (
      <div className="mint-gate">
        {demoToggle}
        <div className="mint-gate-content">
          <div className="mint-gate-icon">🔒</div>
          <h2 className="mint-gate-title">LICENSE REQUIRED</h2>
          <p className="mint-gate-text">
            You need to own a ReDew Validator License to access the dashboard and start earning rewards.
          </p>
          <a href="/mint" className="mint-gate-btn">
            Mint Your License
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {demoToggle}
      {children}
    </>
  );
}