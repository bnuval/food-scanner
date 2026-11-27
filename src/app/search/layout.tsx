import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Healthy Food & Cosmetics | PureBite AI",
  description:
    "Search for food, cosmetics, and personal-care products with PureBite AI. Explore product ratings and retailer links for your market.",
};

export default function SearchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
