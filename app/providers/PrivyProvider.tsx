'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function Privy({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: { 
          theme: 'dark',
          accentColor: '#00FF9D',
        },
        loginMethods: ['email', 'google', 'twitter', 'discord'],
      }}
    >
      {children}
    </PrivyProvider>
  );
}