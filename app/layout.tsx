import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard | ReDew Validators",
  description: "Validator Dashboard for ReDewable Protocol",
  icons: {
    icon: '/assets/battery.png',
  },
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