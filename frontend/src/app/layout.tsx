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
  const hasStackConfig = Boolean(stackClientApp);

  return (
    <html lang="en" data-brand={brand.key}>
      <body
        className={`${dmSans.variable} ${merienda.variable} ${geistMono.variable} antialiased`}
      >
        {hasStackConfig ? (
          <StackProvider app={stackClientApp as NonNullable<typeof stackClientApp>}>
            <StackTheme>
              <Providers>{children}</Providers>
            </StackTheme>
          </StackProvider>
        ) : (
          <div className="min-h-screen flex items-center justify-center p-6 text-center">
            <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-background p-8 shadow-sm">
              <h1 className="text-2xl font-semibold text-foreground">Stack Auth config missing</h1>
              <p className="text-muted-foreground">
                Set NEXT_PUBLIC_STACK_PROJECT_ID and NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY in frontend/.env
                to enable the app. The backend Gemini pipeline is already wired separately.
              </p>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
