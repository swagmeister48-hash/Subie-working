import type { Metadata } from "next";
import type { MetaHTMLAttributes } from "react";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

// Display / headings — characterful grotesk with a motorsport-gauge personality.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

// Body — clean, highly readable, modern (not plain Inter-everywhere).
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Mono — part numbers, the search box, prices.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SubieDeal — Subaru parts price comparison",
  description: "Compare Subaru part prices across 18 retailers and jump to the best deal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {/* Impact.com site verification — MUST keep value= (not content=), so it
            can't go through Next's metadata helpers (those emit content=). React 19
            hoists this <meta> into <head>; the `as` cast is because the meta type
            doesn't include `value`. */}
        <meta
          {...({
            name: "impact-site-verification",
            value: "34b897bf-f1af-4adc-8f51-a4a554e1f0f2",
          } as unknown as MetaHTMLAttributes<HTMLMetaElement>)}
        />
        {children}
        {/* Optimized GA4 (loads via next/script strategy — keeps CWV intact).
            Independent of the custom events-table analytics. */}
        <GoogleAnalytics gaId="G-37BC372TDM" />
      </body>
    </html>
  );
}
