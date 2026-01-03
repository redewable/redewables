export const dynamic = 'force-dynamic';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mint | ReDew Validators",
  description: "Mint your ReDew Validator License",
};

export default function MintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}