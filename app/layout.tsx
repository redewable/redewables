import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "./providers/WalletProvider";
import PrivyWrapper from "./providers/PrivyProvider";

export const metadata: Metadata = {
  title: "ReDew Validators",
  description: "Validator Dashboard for ReDewable Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PrivyWrapper>
          <SolanaWalletProvider>
            {children}
          </SolanaWalletProvider>
        </PrivyWrapper>
      </body>
    </html>
  );
}