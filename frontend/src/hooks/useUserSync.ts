"use client";

import { useCallback, useEffect } from "react";
import { useStackApp } from "@stackframe/stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API = "http://localhost:8000";

async function authedFetch(url: string, token: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "x-stack-access-token": token,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function useGetToken() {
  const stackApp = useStackApp();
  return useCallback(async () => {
    const user = await stackApp.getUser();
    if (!user) throw new Error("Not authenticated");
    const { accessToken } = await user.getAuthJson();
    if (!accessToken) throw new Error("No access token available");
    return accessToken;
  }, [stackApp]);
}

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  stackUserId: string;
  role: "CANDIDATE" | "HR";
  hasCompletedRoleOnboarding: boolean;
}

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
  const getToken = useGetToken();

  useEffect(() => {
    const syncUser = async () => {
      try {
        const token = await getToken();
        const data = await authedFetch(`${API}/api/user/sync`, token, { method: "POST" });
        console.log("User synced successfully:", data.data);
      } catch (error) {
        console.error("Error syncing user:", error);
      }
    };

    syncUser();
  }, [getToken]);
}

export function useCurrentUser() {
  const getToken = useGetToken();

  return useQuery<AppUser>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/user/me`, token);
      return data.data;
    },
  });
}

export function useUpdateUserRole() {
  const getToken = useGetToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (role: "CANDIDATE" | "HR") => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/user/role`, token, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      return data.data as AppUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}
