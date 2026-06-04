import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subaru Parts Price Comparison",
  description: "Compare car part prices across retailers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
