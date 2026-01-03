import type { Metadata } from "next";
import "./globals.css";
import "./animations.css";
import "./components.css";
import { SolanaWalletProvider } from "./providers/WalletProvider";
import PrivyWrapper from "./providers/PrivyProvider";
import { Toaster } from "react-hot-toast"; // ✅ Added Toast Support

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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&display=swap"/>
      </head>
      <body className="antialiased">
        <PrivyWrapper>
          <SolanaWalletProvider>
            {children}
          </SolanaWalletProvider>
        </PrivyWrapper>
        {/* ✅ The Toaster container renders notifications globally */}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
            },
          }}
        />
      </body>
    </html>
  );
}