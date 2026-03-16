import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack/client";
import { DM_Sans, Geist_Mono, Merienda } from "next/font/google";
import { Providers } from "./providers";
import { getBrandConfig } from "@/lib/branding";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
});

const merienda = Merienda({
  variable: "--font-merienda",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const brand = getBrandConfig();

export const metadata: Metadata = {
  title: brand.appNameWithSuffix,
  description: brand.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-brand={brand.key}>
      <body
        className={`${dmSans.variable} ${merienda.variable} ${geistMono.variable} antialiased`}
      ><StackProvider app={stackClientApp}><StackTheme>
        <Providers>
          {children}
        </Providers>
      </StackTheme></StackProvider></body>
    </html>
  );
}
