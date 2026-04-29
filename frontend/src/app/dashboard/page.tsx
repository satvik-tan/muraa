"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCurrentUser, useUpdateUserRole, useUserSync } from "@/hooks/useUserSync";
import {
  useJobs,
  useAvailableJobs,
  useMyApplications,
  type Job,
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

// ── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  onDelete,
  onToggleStatus,
  isUpdatingStatus,
}: {
  job: Job;
  onDelete: (id: string) => void;
  onToggleStatus: (job: Job) => void;
  isUpdatingStatus: boolean;
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
    Junior: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200 border border-emerald-500/30 dark:border-emerald-300/40",
    Mid: "bg-blue-500/15 text-blue-700 dark:bg-blue-400/20 dark:text-blue-200 border border-blue-500/30 dark:border-blue-300/40",
    Senior: "bg-fuchsia-500/15 text-fuchsia-700 dark:bg-fuchsia-400/20 dark:text-fuchsia-200 border border-fuchsia-500/30 dark:border-fuchsia-300/40",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-5 transition-all duration-150">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-1 mb-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="font-display font-bold text-lg text-foreground leading-tight truncate">{job.title}</h3>
          {job.companyName && (
            <span className="text-sm text-muted-foreground">{job.companyName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={job.isOpen ? "secondary" : "outline"}>
            {job.isOpen ? "Open" : "Closed"}
          </Badge>
          {job.experienceLevel && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${levelColors[job.experienceLevel] ?? "bg-muted text-muted-foreground border border-border"}`}>
              {job.experienceLevel}
            </span>
          )}
        </div>
      </div>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs max-w-full whitespace-normal wrap-break-word h-auto py-1 leading-tight border border-border/60 bg-muted/70 dark:bg-muted/30">
              {skill}
            </Badge>
          ))}
        </div>
      )}

      {/* Candidate count */}
      <div className="text-sm text-muted-foreground rounded bg-muted/60 dark:bg-muted/30 px-2 py-1.5 border border-border/70 mb-3">
        <span className="font-semibold text-foreground">{job._count?.sessions ?? 0}</span> candidate
        {(job._count?.sessions ?? 0) !== 1 ? "s" : ""}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/70">
        <Button size="sm" onClick={handleLaunch}>
          Launch
        </Button>
        <Button size="sm" variant="outline" onClick={handleShare}>
          Share Link
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggleStatus(job)}
          disabled={isUpdatingStatus}
        >
          {job.isOpen ? "Close Job" : "Reopen Job"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/dashboard/jobs/${job.id}/candidates`)}
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

  const { jobsQuery, createJob, deleteJob, updateJobStatus } = useJobs();
  const currentUserQuery = useCurrentUser();
  const updateUserRole = useUpdateUserRole();
  const myApplicationsQuery = useMyApplications(currentUserQuery.data?.role === "CANDIDATE");
  const availableJobsQuery = useAvailableJobs(currentUserQuery.data?.role === "CANDIDATE");
  const [createOpen, setCreateOpen] = useState(false);

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

  const handleToggleJobStatus = (job: Job) => {
    updateJobStatus.mutate(
      { jobId: job.id, isOpen: !job.isOpen },
      {
        onSuccess: () => toast.success(job.isOpen ? "Job closed." : "Job reopened."),
        onError: () => toast.error("Failed to update job status."),
      },
    );
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
    const appliedJobIds = new Set(applications.map((application) => application.jobId));
    const availableJobs = (availableJobsQuery.data ?? []).filter((job) => !appliedJobIds.has(job.id));
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-4xl px-4 pt-28 pb-16">
          <div className="mb-10">
            <div className="mb-6">
              <h1 className="font-display font-black text-4xl text-foreground mb-2">Available Jobs</h1>
              <p className="text-muted-foreground">Open roles you can apply to right now.</p>
            </div>
            {availableJobsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border-2 border-border bg-card h-56 animate-pulse" />
                ))}
              </div>
            ) : availableJobs.length === 0 ? (
              <div className="rounded-2xl border-2 border-border bg-card p-8 text-sm text-muted-foreground">
                No open jobs are available right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableJobs.map((job) => (
                  <div key={job.id} className="group relative h-full overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-150 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-base text-foreground leading-tight truncate">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.companyName ?? "Independent"}</p>
                      </div>
                      {job.experienceLevel && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-sm">{job.experienceLevel}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
                    {job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skills.slice(0, 6).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs px-2 py-0.5 rounded-sm">{skill}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/70">
                      <span className="text-xs text-muted-foreground">Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      <Button asChild size="sm">
                        <a href={`/apply/${job.shareId}`}>Apply now</a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display font-black text-3xl text-foreground mb-2">My Applications</h2>
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
                    <TableRow key={a.id} className="">
                      <TableCell className="font-medium">{a.job?.title ?? "—"}</TableCell>
                      <TableCell>{a.job?.companyName ?? "—"}</TableCell>
                      <TableCell>{a.fullName ?? "—"}</TableCell>
                      <TableCell>{a.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "APPROVED" ? "default" : a.status === "REJECTED" ? "destructive" : "secondary"} className={a.status === "APPROVED" ? "border-2 border-black" : ""}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                          {a.status === "APPROVED" && a.job?.shareId && (
                            <Button
                              asChild
                              size="sm"
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/interview/${a.job.shareId}`);
                                toast.success(`Starting interview for ${a.job.title}!`);
                              }}
                            >
                              <a href={`/interview/${a.job.shareId}`} className="no-underline">Start Interview</a>
                            </Button>
                          )}
                        </div>
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
              <div key={i} className="rounded-2xl border-2 border-border bg-card h-52 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border-2 border-border bg-card p-12 text-center">
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
                onToggleStatus={handleToggleJobStatus}
                isUpdatingStatus={updateJobStatus.isPending}
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
    </div>
  );
}
