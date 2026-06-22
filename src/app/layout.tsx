import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Fragment_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";

const fragmentMono = Fragment_Mono({
  variable: "--font-fragment-mono",
  subsets: ["latin"],
  weight: ["400"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2D8B47",
};

export const metadata: Metadata = {
  title: "LeadFarm — Precision Agriculture IoT",
  description: "Plateforme de traçabilité phytosanitaire et monitoring IoT pour l'agriculture de précision en Algérie",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LeadFarm" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fragmentMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
