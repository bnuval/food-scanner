import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PureBite AI - Health Scanner",
  description: "Instant Buy or Avoid Food Verdict",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100">{children}</body>
    </html>
  );
}
