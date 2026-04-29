"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStackApp } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { getBrandConfig } from "@/lib/branding";

const Navbar = () => {
  const brand = getBrandConfig();
  const stackApp = useStackApp();
  const [authResolved, setAuthResolved] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolveAuth = async () => {
      const user = await stackApp.getUser();
      if (!mounted) return;
      setIsSignedIn(Boolean(user));
      setAuthResolved(true);
    };
    resolveAuth();
    return () => {
      mounted = false;
    };
  }, [stackApp]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b-2 border-black">
      <div className="container mx-auto flex items-center justify-between h-18 px-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 border-2 border-black bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display text-sm font-bold">CH</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">{brand.appNameWithSuffix}</span>
        </div>
        <div className="hidden md:flex items-center gap-4 font-body text-xs font-bold text-foreground uppercase tracking-[0.08em]">
          <Link href="/#features" className="border-2 border-black bg-card px-3 py-2 transition-all">Features</Link>
          <Link href="/#how-it-works" className="border-2 border-black bg-card px-3 py-2 transition-all">How it works</Link>
          <Link href="/#pricing" className="border-2 border-black bg-card px-3 py-2 transition-all">Pricing</Link>
        </div>
        <div className="flex items-center gap-3">
          {authResolved ? (
            isSignedIn ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/handler/sign-in">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/handler/sign-up">Start free</Link>
                </Button>
              </>
            )
          ) : (
            <div className="h-8 w-24" aria-hidden="true" />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
