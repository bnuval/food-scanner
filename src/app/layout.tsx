import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AnalyticsTracker from "../components/AnalyticsTracker";

const inter = Inter({ subsets: ["latin"] });

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PureBite AI",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  inLanguage: "en",
  description:
    "An AI-powered web app for reviewing food, cosmetic, and personal-care product labels and searching for products.",
};

export const metadata: Metadata = {
  title: "PureBite AI | Healthy Food & Cosmetic Ingredient Scanner",
  description:
    "Scan packaged food and cosmetic labels with AI, check ingredients, get a health score, and search for healthier food and personal-care products.",
  openGraph: {
    title: "PureBite AI | Healthy Food & Cosmetic Ingredient Scanner",
    description:
      "Scan packaged food and cosmetic labels with AI, check ingredients, and discover healthier products.",
    siteName: "PureBite AI",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PureBite AI | Healthy Food & Cosmetic Ingredient Scanner",
    description:
      "Scan packaged food and cosmetic labels with AI, check ingredients, and discover healthier products.",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
