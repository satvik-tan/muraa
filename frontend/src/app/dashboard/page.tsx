"use client";

import { useUserSync } from "@/hooks/useUserSync";

export default function DashboardPage() {
  // Sync user to backend database on mount (after signup/login)
  useUserSync();

  return <main className="min-h-screen" />;
}
