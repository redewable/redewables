'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { usePrivy } from '@privy-io/react-auth';
import { useMemo, useCallback } from 'react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

interface UnifiedWallet {
  // Connection state
  connected: boolean;
  connecting: boolean;
  
  // Wallet info
  publicKey: PublicKey | null;
  address: string | null;
  
  // Auth source
  isPrivyAuth: boolean;
  isExternalWallet: boolean;
  
  // Actions
  connect: () => void;
  disconnect: () => Promise<void>;
  signTransaction: ((tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>) | null;
  
  // Privy user info (for display)
  privyUser: any;
  privyAuthenticated: boolean;
}

export function useUnifiedWallet(): UnifiedWallet {
  // Solana wallet adapter (Phantom, Solflare, etc.)
  const { 
    publicKey: adapterPublicKey, 
    connected: adapterConnected,
    connecting: adapterConnecting,
    disconnect: adapterDisconnect,
    signTransaction: adapterSignTransaction,
  } = useWallet();
  
  // Privy (email, social login)
  const { 
    authenticated: privyAuthenticated, 
    user: privyUser,
    logout: privyLogout,
  } = usePrivy();
  
  // External wallet takes priority
  const isExternalWallet = adapterConnected && !!adapterPublicKey;
  const isPrivyAuth = !isExternalWallet && privyAuthenticated;
  
  // Only external wallets can sign transactions
  const publicKey = adapterPublicKey;
  const address = publicKey?.toString() || null;
  
  // Combined connected state (either wallet or privy auth)
  const connected = isExternalWallet || isPrivyAuth;
  const connecting = adapterConnecting;
  
  // Sign transaction only available for external wallets
  const signTransaction = adapterSignTransaction || null;
  
  // Disconnect function
  const disconnect = useCallback(async () => {
    if (isExternalWallet) {
      await adapterDisconnect();
    }
    if (privyAuthenticated) {
      await privyLogout();
    }
  }, [isExternalWallet, adapterDisconnect, privyAuthenticated, privyLogout]);
  
  // Connect is handled by the modal/UI
  const connect = useCallback(() => {}, []);
  
  return {
    connected,
    connecting,
    publicKey,
    address,
    isPrivyAuth,
    isExternalWallet,
    connect,
    disconnect,
    signTransaction,
    privyUser,
    privyAuthenticated,
  };
}