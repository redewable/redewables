import type { Metadata } from "next";
import "./globals.css";

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
      <body>
        <div className="grid-floor"></div>
        {children}
      </body>
    </html>
  );
}