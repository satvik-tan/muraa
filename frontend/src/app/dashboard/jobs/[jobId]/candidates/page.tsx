"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentUser, useUserSync } from "@/hooks/useUserSync";
import {
  useJobs,
  useJobCandidates,
  useApplicationsForJob,
  useUpdateApplicationStatus,
  type CandidateSession,
} from "@/hooks/useJobs";
import { useInterviewUpload } from "@/hooks/useInterviewUpload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function TranscriptViewer({ session }: { session: CandidateSession }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
      >
        View
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg">
              Transcript - {session.candidateName ?? "Candidate"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            {session.transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transcript available.</p>
            ) : (
              session.transcript.map((t) => (
                <div
                  key={t.id}
                  className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-body ${
                      t.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <span className="block text-[10px] font-semibold mb-1 opacity-60">
                      {t.role === "nova" ? "Ary" : "Candidate"}
                    </span>
                    {t.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecordingAction({ session }: { session: CandidateSession }) {
  const hasRecording = Boolean(session.recordingKey?.trim());
  const { getPlaybackUrl } = useInterviewUpload();
  const [isLoading, setIsLoading] = useState(false);

  const handlePlay = async () => {
    try {
      setIsLoading(true);
      const { url } = await getPlaybackUrl.mutateAsync(session.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load recording.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasRecording) {
    return (
      <span className="text-xs text-muted-foreground" title="Recording has not been uploaded for this interview session yet.">
        No recording
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handlePlay}
      className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
    >
      {isLoading ? "Loading..." : "Play Recording"}
    </button>
  );
}

export default function JobCandidatesPage() {
  useUserSync();

  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;

  const currentUserQuery = useCurrentUser();
  const { jobsQuery } = useJobs();
  const { data: candidates, isLoading } = useJobCandidates(jobId ?? null);
  const { data: applications, isLoading: isLoadingApplications } = useApplicationsForJob(jobId ?? null);
  const updateApplicationStatus = useUpdateApplicationStatus();

  const job = (jobsQuery.data ?? []).find((item) => item.id === jobId);

  const handleReview = async (applicationId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await updateApplicationStatus.mutateAsync({ applicationId, status });
      toast.success(`Application ${status === "APPROVED" ? "approved" : "rejected"}.`);
    } catch {
      toast.error("Failed to update application status.");
    }
  };

  if (currentUserQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
          <div className="rounded-2xl border border-border bg-card h-48 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!currentUserQuery.data || currentUserQuery.data.role !== "HR") {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-3xl px-4 pt-28 pb-16">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="font-display font-black text-3xl text-foreground mb-2">Access denied</h1>
            <p className="text-sm text-muted-foreground mb-6">Only HR users can access this page.</p>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="font-display font-black text-4xl text-foreground mb-1">
              Candidates and Interviews
            </h1>
            <p className="text-muted-foreground">
              {job ? `${job.title}${job.companyName ? ` - ${job.companyName}` : ""}` : "Job details"}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back</Link>
          </Button>
        </div>

        {isLoadingApplications ? (
          <p className="text-sm text-muted-foreground py-4">Loading applications...</p>
        ) : !applications || applications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No applications yet.</p>
        ) : (
          <div className="mb-8 rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Applications</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Exp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.fullName ?? a.candidate?.name ?? "-"}</TableCell>
                    <TableCell>{a.email ?? a.candidate?.email ?? "-"}</TableCell>
                    <TableCell>{a.phone ?? "-"}</TableCell>
                    <TableCell>{a.currentCompany ?? "-"}</TableCell>
                    <TableCell>{a.yearsExperience ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "APPROVED" ? "default" : a.status === "REJECTED" ? "destructive" : "secondary"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleReview(a.id, "APPROVED")}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReview(a.id, "REJECTED")}>Reject</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Reviewed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Interview Sessions</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : !candidates || candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No interview sessions yet. Candidates can start only after approval.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Transcript</TableHead>
                  <TableHead>Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.candidateName ?? "-"}</TableCell>
                    <TableCell>{c.candidateEmail ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={c.isCompleted ? "default" : "secondary"}>
                        {c.isCompleted ? "Completed" : "In Progress"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.application?.status === "APPROVED" ? "default" : "secondary"}>
                        {c.application?.status ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.startedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <TranscriptViewer session={c} />
                    </TableCell>
                    <TableCell>
                      <RecordingAction session={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
