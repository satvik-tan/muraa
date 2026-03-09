"use client";

import { useEffect } from "react";
import { useStackApp } from "@stackframe/stack";

/**
 * useUserSync
 * 
 * Syncs the current user to the backend database immediately after signup/login.
 * Calls POST /api/user/sync with the user's access token.
 * 
 * Use this hook in any page/component that should trigger user sync
 * (typically on the dashboard or after auth flow completes).
 */
export function useUserSync() {
  const stackApp = useStackApp();

  useEffect(() => {
    const syncUser = async () => {
      try {
        const user = await stackApp.getUser();
        
        if (!user) {
          console.log("No user authenticated");
          return;
        }

        // Get the access token from Stack Auth
        const { accessToken } = await user.getAuthJson();

        if (!accessToken) {
          console.error("No access token available");
          return;
        }

        // Call the backend sync endpoint (explicitly target local backend on port 5000)
        const response = await fetch("http://localhost:5000/api/user/sync", {
          method: "POST",
          headers: {
            "x-stack-access-token": accessToken,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to sync user:", error);
          return;
        }

        const data = await response.json();
        console.log("User synced successfully:", data.data);
      } catch (error) {
        console.error("Error syncing user:", error);
      }
    };

    syncUser();
  }, [stackApp]);
}
