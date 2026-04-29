import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack/client";
import { Space_Mono, Syne } from "next/font/google";
import { Providers } from "./providers";
import ThemeToggle from "@/components/ThemeToggle";
import { getBrandConfig } from "@/lib/branding";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
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
        className={`${spaceMono.variable} ${syne.variable} antialiased`}
      ><StackProvider app={stackClientApp}><StackTheme>
        <Providers>
          <ThemeToggle />
          {children}
        </Providers>
      </StackTheme></StackProvider></body>
    </html>
  );
}
