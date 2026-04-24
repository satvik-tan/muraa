"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCurrentUser, useUpdateUserRole, useUserSync } from "@/hooks/useUserSync";
import {
  useJobs,
  useJobCandidates,
  useApplicationsForJob,
  useUpdateApplicationStatus,
  useMyApplications,
  type Job,
  type CandidateSession,
  type CreateJobInput,
} from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useInterviewUpload } from "@/hooks/useInterviewUpload";

// ── Create Job Form ──────────────────────────────────────────────────────────

type CreateFormValues = {
  title: string;
  description: string;
  companyName: string;
  experienceLevel: string;
  skillsRaw: string;
};

function CreateJobDialog({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateJobInput) => Promise<void>;
  isPending: boolean;
}) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreateFormValues>({
    defaultValues: { title: "", description: "", companyName: "", experienceLevel: "", skillsRaw: "" },
  });

  const handleFormSubmit = async (values: CreateFormValues) => {
    const skills = values.skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await onSubmit({
      title: values.title,
      description: values.description,
      companyName: values.companyName,
      experienceLevel: values.experienceLevel,
      skills,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl">New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Job Title *</label>
            <Input
              placeholder="e.g. Senior React Developer"
              {...register("title", { required: "Required" })}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Company Name</label>
            <Input placeholder="e.g. Acme Corp" {...register("companyName")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Experience Level</label>
            <Controller
              name="experienceLevel"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Skills / Tech Stack</label>
            <Input
              placeholder="React, TypeScript, Node.js (comma-separated)"
              {...register("skillsRaw")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Description / Requirements *</label>
            <Textarea
              placeholder="Describe the role, responsibilities and requirements..."
              rows={4}
              {...register("description", { required: "Required" })}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex gap-3 pt-1 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Transcript viewer ────────────────────────────────────────────────────────

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
              Transcript — {session.candidateName ?? "Candidate"}
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
      {isLoading ? "Loading…" : "Play Recording"}
    </button>
  );
}

// ── Candidates Dialog ────────────────────────────────────────────────────────

function CandidatesDialog({
  jobId,
  jobTitle,
  onClose,
}: {
  jobId: string | null;
  jobTitle: string;
  onClose: () => void;
}) {
  const { data: candidates, isLoading } = useJobCandidates(jobId);
  const { data: applications, isLoading: isLoadingApplications } = useApplicationsForJob(jobId);
  const updateApplicationStatus = useUpdateApplicationStatus();

  const handleReview = async (applicationId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await updateApplicationStatus.mutateAsync({ applicationId, status });
      toast.success(`Application ${status === "APPROVED" ? "approved" : "rejected"}.`);
    } catch {
      toast.error("Failed to update application status.");
    }
  };

  return (
    <Dialog open={!!jobId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl">
            Applications and Interviews — {jobTitle}
          </DialogTitle>
        </DialogHeader>
        {isLoadingApplications ? (
          <p className="text-sm text-muted-foreground py-4">Loading applications…</p>
        ) : !applications || applications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No applications yet.</p>
        ) : (
          <div className="mb-6">
            <h3 className="font-semibold text-sm mb-2">Applications</h3>
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
                    <TableCell className="font-medium">{a.fullName ?? a.candidate?.name ?? "—"}</TableCell>
                    <TableCell>{a.email ?? a.candidate?.email ?? "—"}</TableCell>
                    <TableCell>{a.phone ?? "—"}</TableCell>
                    <TableCell>{a.currentCompany ?? "—"}</TableCell>
                    <TableCell>{a.yearsExperience ?? "—"}</TableCell>
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

        <h3 className="font-semibold text-sm mb-2">Interview Sessions</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
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
                  <TableCell className="font-medium">{c.candidateName ?? "—"}</TableCell>
                  <TableCell>{c.candidateEmail ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.isCompleted ? "default" : "secondary"}>
                      {c.isCompleted ? "Completed" : "In Progress"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.application?.status === "APPROVED" ? "default" : "secondary"}>
                      {c.application?.status ?? "—"}
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
      </DialogContent>
    </Dialog>
  );
}

// ── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  onDelete,
  onViewCandidates,
}: {
  job: Job;
  onDelete: (id: string) => void;
  onViewCandidates: (job: Job) => void;
}) {
  const router = useRouter();

  const handleLaunch = () => {
    router.push(`/interview/${job.shareId}`);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/interview/${job.shareId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const levelColors: Record<string, string> = {
    Junior: "bg-green-500/10 text-green-700 dark:text-green-400",
    Mid: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    Senior: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-display font-bold text-lg text-foreground leading-tight truncate">{job.title}</h3>
          {job.companyName && (
            <span className="text-sm text-muted-foreground">{job.companyName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.experienceLevel && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${levelColors[job.experienceLevel] ?? "bg-muted text-muted-foreground"}`}>
              {job.experienceLevel}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{job.description}</p>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      )}

      {/* Candidate count */}
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{job._count?.sessions ?? 0}</span> candidate
        {(job._count?.sessions ?? 0) !== 1 ? "s" : ""}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        <Button size="sm" onClick={handleLaunch}>
          Launch
        </Button>
        <Button size="sm" variant="outline" onClick={handleShare}>
          Share Link
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewCandidates(job)}
          disabled={(job._count?.sessions ?? 0) === 0}
        >
          Candidates ({job._count?.sessions ?? 0})
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
          onClick={() => {
            if (confirm(`Delete "${job.title}"? This will also delete all candidate sessions.`)) {
              onDelete(job.id);
            }
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  useUserSync();

  const { jobsQuery, createJob, deleteJob } = useJobs();
  const currentUserQuery = useCurrentUser();
  const updateUserRole = useUpdateUserRole();
  const myApplicationsQuery = useMyApplications(currentUserQuery.data?.role === "CANDIDATE");
  const [createOpen, setCreateOpen] = useState(false);
  const [candidatesTarget, setCandidatesTarget] = useState<Job | null>(null);

  const handleCreate = async (input: CreateJobInput) => {
    try {
      await createJob.mutateAsync(input);
      setCreateOpen(false);
      toast.success("Job created!");
    } catch {
      toast.error("Failed to create job.");
    }
  };

  const handleDelete = (id: string) => {
    deleteJob.mutate(id, {
      onSuccess: () => toast.success("Job deleted."),
      onError: () => toast.error("Failed to delete job."),
    });
  };

  const jobs = jobsQuery.data ?? [];

  if (currentUserQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
          <div className="rounded-2xl border border-border bg-card h-48 animate-pulse" />
        </main>
      </div>
    );
  }

  const currentUser = currentUserQuery.data;

  if (!currentUser?.hasCompletedRoleOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-xl px-4 pt-28 pb-16">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="font-display font-black text-3xl text-foreground mb-2">Choose your role</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This helps us show the right dashboard and interview flow.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                disabled={updateUserRole.isPending}
                onClick={() => updateUserRole.mutate("CANDIDATE")}
              >
                Continue as Candidate
              </Button>
              <Button
                variant="outline"
                disabled={updateUserRole.isPending}
                onClick={() => updateUserRole.mutate("HR")}
              >
                Continue as HR
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (currentUser.role === "CANDIDATE") {
    const applications = myApplicationsQuery.data ?? [];
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-4xl px-4 pt-28 pb-16">
          <h1 className="font-display font-black text-4xl text-foreground mb-2">My Applications</h1>
          <p className="text-muted-foreground mb-6">Track your job applications and approval status.</p>
          {myApplicationsQuery.isLoading ? (
            <div className="rounded-2xl border border-border bg-card h-48 animate-pulse" />
          ) : applications.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
              You have not applied to any jobs yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.job?.title ?? "—"}</TableCell>
                    <TableCell>{a.job?.companyName ?? "—"}</TableCell>
                    <TableCell>{a.fullName ?? "—"}</TableCell>
                    <TableCell>{a.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "APPROVED" ? "default" : a.status === "REJECTED" ? "destructive" : "secondary"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-black text-4xl sm:text-5xl text-foreground leading-tight mb-1">
              Dashboard
            </h1>
            <p className="text-muted-foreground font-body">Create interview jobs and track candidates.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            New Job
          </Button>
        </div>

        {/* Job list */}
        {jobsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-48 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground font-body mb-4">No jobs yet. Create your first one to get started.</p>
            <Button onClick={() => setCreateOpen(true)}>Create Job</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDelete={handleDelete}
                onViewCandidates={setCandidatesTarget}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CreateJobDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={createJob.isPending}
      />

      <CandidatesDialog
        jobId={candidatesTarget?.id ?? null}
        jobTitle={candidatesTarget?.title ?? ""}
        onClose={() => setCandidatesTarget(null)}
      />
    </div>
  );
}
