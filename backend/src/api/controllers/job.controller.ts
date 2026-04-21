import type { Request, Response } from "express";
import { prisma } from "../../services/prisma.js";

type JobIdParams = { id: string };
type ShareIdParams = { shareId: string };

/** Resolve the Stack Auth JWT subject to the DB User row */
async function getUserByStackId(stackUserId: string) {
  return prisma.user.findUnique({ where: { stackUserId } });
}

async function ensureUserFromToken(req: Request) {
  const { sub: stackUserId, email, name } = req.user!;
  if (!email) return null;
  return prisma.user.upsert({
    where: { stackUserId },
    update: { email, name: name ?? null },
    create: {
      stackUserId,
      email,
      name: name ?? null,
      createdAt: new Date(),
    },
  });
}

// POST /api/jobs
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    const { title, description, companyName, experienceLevel, skills } = req.body;

    if (!title || !description) {
      res.status(400).json({ success: false, message: "title and description are required" });
      return;
    }

    const job = await prisma.job.create({
      data: {
        userId: user.id,
        title,
        description,
        companyName: companyName ?? null,
        experienceLevel: experienceLevel ?? null,
        skills: Array.isArray(skills) ? skills : [],
      },
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// GET /api/jobs
export const listJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { sessions: true } } },
    });

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to list jobs",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// DELETE /api/jobs/:id
export const deleteJob = async (req: Request<JobIdParams>, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.userId !== user.id) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    await prisma.job.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// GET /api/jobs/share/:shareId  — PUBLIC, no auth
export const getJobByShareId = async (req: Request<ShareIdParams>, res: Response): Promise<void> => {
  try {
    const job = await prisma.job.findUnique({
      where: { shareId: req.params.shareId },
      select: {
        id: true,
        title: true,
        description: true,
        companyName: true,
        experienceLevel: true,
        skills: true,
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch job",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// POST /api/jobs/share/:shareId/candidates  — AUTH required + approved allowlist
export const createCandidateSessionByShareId = async (
  req: Request<ShareIdParams>,
  res: Response
): Promise<void> => {
  try {
    const user = await ensureUserFromToken(req);
    if (!user) {
      res.status(400).json({ success: false, message: "Authenticated user email is required" });
      return;
    }

    const job = await prisma.job.findUnique({
      where: { shareId: req.params.shareId },
      select: { id: true, shareId: true },
    });

    if (!job) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const application = await prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId: job.id,
          userId: user.id,
        },
      },
      select: { status: true },
    });

    if (!application || application.status !== "approved") {
      res.status(403).json({
        success: false,
        message: "Interview access is not active for this account",
        data: { applicationStatus: application?.status ?? "not_applied" },
      });
      return;
    }

    const session = await prisma.interviewSession.create({
      data: {
        jobId: job.id,
        userId: user.id,
        candidateName: user.name ?? null,
        candidateEmail: user.email,
      },
      select: {
        id: true,
        jobId: true,
        candidateName: true,
        candidateEmail: true,
        startedAt: true,
      },
    });

    res.status(201).json({ success: true, data: { ...session, shareId: job.shareId } });
  } catch (error) {
    console.error("Failed to create candidate session", error);
    res.status(500).json({
      success: false,
      message: "Failed to create candidate session",
    });
  }
};

// POST /api/jobs/share/:shareId/apply — AUTH required
export const applyToJobByShareId = async (req: Request<ShareIdParams>, res: Response): Promise<void> => {
  try {
    const user = await ensureUserFromToken(req);
    if (!user) {
      res.status(400).json({ success: false, message: "Authenticated user email is required" });
      return;
    }

    const applicationText =
      typeof req.body?.applicationText === "string" ? req.body.applicationText.trim() : "";
    if (!applicationText) {
      res.status(400).json({ success: false, message: "applicationText is required" });
      return;
    }

    const job = await prisma.job.findUnique({
      where: { shareId: req.params.shareId },
      select: { id: true },
    });
    if (!job) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const application = await prisma.jobApplication.upsert({
      where: {
        jobId_userId: {
          jobId: job.id,
          userId: user.id,
        },
      },
      update: {
        applicationText,
        status: "pending",
        approvedAt: null,
      },
      create: {
        jobId: job.id,
        userId: user.id,
        applicationText,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// GET /api/jobs/share/:shareId/access — AUTH required
export const getShareLinkAccessByShareId = async (req: Request<ShareIdParams>, res: Response): Promise<void> => {
  try {
    const user = await ensureUserFromToken(req);
    if (!user) {
      res.status(400).json({ success: false, message: "Authenticated user email is required" });
      return;
    }

    const job = await prisma.job.findUnique({
      where: { shareId: req.params.shareId },
      select: { id: true },
    });
    if (!job) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const application = await prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId: job.id,
          userId: user.id,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        approvedAt: true,
      },
    });

    const status = application?.status ?? "not_applied";
    res.status(200).json({
      success: true,
      data: {
        applicationId: application?.id ?? null,
        applicationStatus: status,
        isAllowed: status === "approved",
        createdAt: application?.createdAt ?? null,
        approvedAt: application?.approvedAt ?? null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch access status",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// GET /api/jobs/:id/candidates
export const getJobCandidates = async (req: Request<JobIdParams>, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.userId !== user.id) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const sessions = await prisma.interviewSession.findMany({
      where: { jobId: req.params.id },
      include: { transcript: { orderBy: { timestamp: "asc" } } },
      orderBy: { startedAt: "desc" },
    });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch candidates",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// GET /api/jobs/:id/applications
export const getJobApplications = async (req: Request<JobIdParams>, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.userId !== user.id) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        inmail: { select: { id: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const statusPriority: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
    applications.sort(
      (a: { status: string }, b: { status: string }) =>
        (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99)
    );

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// POST /api/jobs/:id/applications/:applicationId/approve
export const approveJobApplication = async (
  req: Request<JobIdParams & { applicationId: string }>,
  res: Response
): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.userId !== user.id) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: req.params.applicationId },
      include: { user: true, job: true },
    });
    if (!application || application.jobId !== job.id) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    const now = new Date();
    const approved = await prisma.jobApplication.update({
      where: { id: application.id },
      data: {
        status: "approved",
        approvedAt: now,
      },
      select: { id: true, status: true, approvedAt: true },
    });

    await prisma.inMail.upsert({
      where: { applicationId: application.id },
      update: {
        subject: `Interview access granted — ${application.job.title}`,
        body: `You have been approved for ${application.job.title}. You can now use the interview link to start your interview.`,
      },
      create: {
        userId: application.userId,
        jobId: application.jobId,
        applicationId: application.id,
        subject: `Interview access granted — ${application.job.title}`,
        body: `You have been approved for ${application.job.title}. You can now use the interview link to start your interview.`,
      },
    });

    res.status(200).json({ success: true, data: approved });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve application",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
