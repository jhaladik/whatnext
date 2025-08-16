import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhatNext - Find Your Perfect Movie",
  description: "AI-powered movie recommendations that understand your mood",
  manifest: "/manifest.json",
  openGraph: {
    title: "WhatNext - Find Your Perfect Movie",
    description: "AI-powered movie recommendations that understand your mood",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#a855f7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
