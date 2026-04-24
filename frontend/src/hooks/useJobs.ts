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
  application?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
  } | null;
  transcript: TranscriptRow[];
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  coverLetter: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  candidate?: {
    id: string;
    name: string | null;
    email: string;
  };
  job?: {
    id: string;
    title: string;
    companyName: string | null;
    shareId: string;
  };
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

export function useApplicationsForJob(jobId: string | null) {
  const getToken = useGetToken();

  return useQuery<Application[]>({
    queryKey: ["applications", "job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/jobs/${jobId}/applications`, token);
      return data.data;
    },
  });
}

export function useMyApplications(enabled = true) {
  const getToken = useGetToken();

  return useQuery<Application[]>({
    queryKey: ["applications", "me"],
    enabled,
    queryFn: async () => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/applications/me`, token);
      return data.data;
    },
  });
}

export function useApplyToJob() {
  const getToken = useGetToken();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      jobId: string;
      fullName: string;
      email: string;
      phone?: string;
      currentCompany?: string;
      yearsExperience?: number;
      coverLetter?: string;
    }) => {
      const token = await getToken();
      return authedFetch(`${API}/api/applications`, token, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications", "me"] });
      qc.invalidateQueries({ queryKey: ["applications", "share"] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const getToken = useGetToken();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { applicationId: string; status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
      const token = await getToken();
      return authedFetch(`${API}/api/applications/${input.applicationId}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({
          status: input.status,
          reviewNote: input.reviewNote,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useMyApplicationForShareId(shareId: string | null, enabled = true) {
  const getToken = useGetToken();

  return useQuery<{ jobId: string; application: Application | null }>({
    queryKey: ["applications", "share", shareId],
    enabled: !!shareId && enabled,
    queryFn: async () => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/applications/job-share/${shareId}/me`, token);
      return data.data;
    },
  });
}

export function useInterviewAccess(shareId: string | null) {
  const getToken = useGetToken();

  return useQuery<{ jobId: string; applicationId: string; applicationStatus: "APPROVED" }>({
    queryKey: ["interview-access", shareId],
    enabled: false,
    retry: false,
    queryFn: async () => {
      const token = await getToken();
      const data = await authedFetch(`${API}/api/interview/access/${shareId}`, token);
      return data.data;
    },
  });
}
