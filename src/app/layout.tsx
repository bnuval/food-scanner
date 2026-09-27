import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AnalyticsTracker from "../components/AnalyticsTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PureBite AI - Clean Food & Cosmetic Scanner",
  description: "Evaluate health scores and discover certified clean products across global markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
