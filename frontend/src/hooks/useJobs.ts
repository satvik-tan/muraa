"use client";

import { useStackApp } from "@stackframe/stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = "http://localhost:8000";

async function authedFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-stack-access-token": token,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function useGetToken() {
  const stackApp = useStackApp();
  return async () => {
    const user = await stackApp.getUser();
    if (!user) throw new Error("Not authenticated");
    const { accessToken } = await user.getAuthJson();
    return accessToken!;
  };
}

export interface Job {
  id: string;
  title: string;
  description: string;
  companyName: string | null;
  experienceLevel: string | null;
  skills: string[];
  shareId: string;
  createdAt: string;
  _count?: { sessions: number };
}

export interface CreateJobInput {
  title: string;
  description: string;
  companyName: string;
  experienceLevel: string;
  skills: string[];
}

export interface TranscriptRow {
  id: string;
  role: "user" | "nova";
  content: string;
  timestamp: string;
}

export interface CandidateSession {
  id: string;
  candidateName: string | null;
  candidateEmail: string | null;
  isCompleted: boolean;
  startedAt: string;
  endedAt: string | null;
  recordingKey?: string | null;
  transcript: TranscriptRow[];
}

export function useJobs() {
  const getToken = useGetToken();
  const qc = useQueryClient();

  const jobsQuery = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/jobs`, token);
      return data.data;
    },
  });

  const createJob = useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const token = await getToken();
      return authedFetch(`${API}/api/jobs`, token, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const deleteJob = useMutation({
    mutationFn: async (jobId: string) => {
      const token = await getToken();
      return authedFetch(`${API}/api/jobs/${jobId}`, token, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  return { jobsQuery, createJob, deleteJob };
}

export function useJobCandidates(jobId: string | null) {
  const getToken = useGetToken();

  return useQuery<CandidateSession[]>({
    queryKey: ["candidates", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/jobs/${jobId}/candidates`, token);
      return data.data;
    },
  });
}
