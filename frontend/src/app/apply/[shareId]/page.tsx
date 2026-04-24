"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser, useUpdateUserRole, useUserSync } from "@/hooks/useUserSync";
import { useApplyToJob, useMyApplicationForShareId } from "@/hooks/useJobs";
import { useQuery } from "@tanstack/react-query";

type JobPublic = {
  id: string;
  title: string;
  description: string;
  companyName: string | null;
  experienceLevel: string | null;
  skills: string[];
  shareId: string;
};

async function fetchJob(shareId: string): Promise<JobPublic> {
  const response = await fetch(`http://localhost:8000/api/jobs/share/${shareId}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data?.message ?? "Failed to load job");
  }
  return data.data;
}

export default function ApplyPage() {
  useUserSync();

  const params = useParams<{ shareId: string }>();
  const router = useRouter();
  const shareId = Array.isArray(params.shareId) ? params.shareId[0] : params.shareId;

  const currentUserQuery = useCurrentUser();
  const updateUserRole = useUpdateUserRole();
  const jobQuery = useQuery({
    queryKey: ["job-public", shareId],
    enabled: !!shareId,
    queryFn: async () => fetchJob(shareId!),
  });
  const myApplicationQuery = useMyApplicationForShareId(shareId ?? null, !!currentUserQuery.data);
  const applyToJob = useApplyToJob();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState("");

  const existingApplication = myApplicationQuery.data?.application ?? null;
  const canShowForm = !existingApplication;

  useEffect(() => {
    if (!currentUserQuery.data) return;
    setFullName(currentUserQuery.data.name ?? "");
    setEmail(currentUserQuery.data.email ?? "");
  }, [currentUserQuery.data]);

  const handleSubmit = async () => {
    setError("");

    if (!jobQuery.data) {
      setError("Job details are still loading.");
      return;
    }

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!coverLetter.trim() || coverLetter.trim().length < 20) {
      setError("Please add a short cover letter or introduction.");
      return;
    }

    try {
      await applyToJob.mutateAsync({
        jobId: jobQuery.data.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        currentCompany: currentCompany.trim(),
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        coverLetter: coverLetter.trim(),
      });
      router.push(`/interview/${shareId}`);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to submit application.");
    }
  };

  const skillCount = useMemo(() => jobQuery.data?.skills.length ?? 0, [jobQuery.data]);

  if (currentUserQuery.isLoading || jobQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-3xl px-4 pt-28 pb-16">
          <div className="rounded-3xl border border-border bg-card h-80 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!currentUserQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 pt-28 pb-16 text-center">
          <h1 className="font-display font-black text-3xl text-foreground mb-3">Log in required</h1>
          <p className="text-muted-foreground mb-4">Please log in before applying to this job.</p>
          <Button asChild>
            <a href="/handler/sign-in">Log in</a>
          </Button>
        </main>
      </div>
    );
  }

  if (!currentUserQuery.data.hasCompletedRoleOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 pt-28 pb-16">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h1 className="font-display font-black text-3xl text-foreground mb-2">Choose your role first</h1>
            <p className="text-sm text-muted-foreground mb-6">We need your role before you can apply.</p>
            <div className="flex gap-3">
              <Button disabled={updateUserRole.isPending} onClick={() => updateUserRole.mutate("CANDIDATE")}>
                Continue as Candidate
              </Button>
              <Button variant="outline" disabled={updateUserRole.isPending} onClick={() => updateUserRole.mutate("HR")}>
                Continue as HR
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (currentUserQuery.data.role !== "CANDIDATE") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 pt-28 pb-16">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h1 className="font-display font-black text-3xl text-foreground mb-2">Candidate role required</h1>
            <p className="text-sm text-muted-foreground mb-6">This page is for candidates applying to a job.</p>
            <Button disabled={updateUserRole.isPending} onClick={() => updateUserRole.mutate("CANDIDATE")}>
              Switch to Candidate
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (jobQuery.error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 pt-28 pb-16 text-center">
          <h1 className="font-display font-black text-3xl text-foreground mb-3">Job Not Found</h1>
          <p className="text-muted-foreground">The job link is invalid or has been removed.</p>
        </main>
      </div>
    );
  }

  const job = jobQuery.data;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 pt-28 pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="font-display font-black text-4xl sm:text-5xl text-foreground leading-tight">
              Apply to {job?.title ?? "this job"}
            </h1>
            {job?.experienceLevel && (
              <span className="text-sm font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
                {job.experienceLevel}
              </span>
            )}
          </div>
          {job?.companyName && <p className="text-muted-foreground text-base mb-2">{job.companyName}</p>}
          <p className="text-muted-foreground text-sm max-w-2xl">{job?.description}</p>
          {skillCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {job?.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {existingApplication ? (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h2 className="font-display font-bold text-2xl text-foreground mb-2">Your application</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You already submitted an application for this job.
            </p>
            <div className="grid gap-3 text-sm mb-6">
              <div className="rounded-xl border border-border p-4">
                <span className="font-medium">Name:</span> {existingApplication.fullName ?? "—"}
              </div>
              <div className="rounded-xl border border-border p-4">
                <span className="font-medium">Email:</span> {existingApplication.email ?? "—"}
              </div>
              <div className="rounded-xl border border-border p-4">
                <span className="font-medium">Status:</span> {existingApplication.status}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push(`/interview/${shareId}`)}>
                Back to interview page
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h2 className="font-display font-bold text-2xl text-foreground mb-2">Build your application</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tell the recruiter who you are and why you want this role.
            </p>

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Email address</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="jane@example.com" />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Phone number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Current company</label>
                <Input value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} placeholder="Acme Inc." />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Years of experience</label>
                <Input value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} type="number" min="0" placeholder="5" />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Cover letter / introduction</label>
                <Textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={7}
                  placeholder="Write a concise note about your background, motivation, and why you're a fit for the role..."
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={applyToJob.isPending}>
                  {applyToJob.isPending ? "Submitting..." : "Submit application"}
                </Button>
                <Button variant="outline" onClick={() => router.push(`/interview/${shareId}`)}>
                  Back
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
