import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../services/prisma.js";

const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  currentCompany: z.string().trim().max(120).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  coverLetter: z.string().trim().min(20).max(4000).optional().or(z.literal("")),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional(),
});

async function getUserByStackId(stackUserId: string) {
  return prisma.user.findUnique({ where: { stackUserId } });
}

export const createApplication = async (req: Request, res: Response): Promise<void> => {
  const parsed = createApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  try {
    const candidate = await getUserByStackId(req.user!.sub);
    if (!candidate) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    if (candidate.role !== "CANDIDATE") {
      res.status(403).json({ success: false, message: "Only candidates can apply to jobs" });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: parsed.data.jobId } });
    if (!job) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const existing = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: parsed.data.jobId,
        },
      },
    });

    if (existing) {
      res.status(409).json({ success: false, message: "You already applied to this job", data: existing });
      return;
    }

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: parsed.data.jobId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone?.trim() || null,
        currentCompany: parsed.data.currentCompany?.trim() || null,
        yearsExperience: parsed.data.yearsExperience ?? null,
        coverLetter: parsed.data.coverLetter?.trim() || null,
      },
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create application",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const listMyApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const candidate = await getUserByStackId(req.user!.sub);
    if (!candidate) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    const applications = await prisma.application.findMany({
      where: { candidateId: candidate.id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            companyName: true,
            shareId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to list applications",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateApplicationStatus = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const parsed = updateApplicationStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  try {
    const hrUser = await getUserByStackId(req.user!.sub);
    if (!hrUser) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    if (hrUser.role !== "HR") {
      res.status(403).json({ success: false, message: "Only HR can review applications" });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { job: true },
    });

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (application.job.userId !== hrUser.id) {
      res.status(403).json({ success: false, message: "You can only review applications for your own jobs" });
      return;
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        status: parsed.data.status,
        reviewNote: parsed.data.reviewNote,
        reviewedAt: new Date(),
        reviewedById: hrUser.id,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update application status",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const listApplicationsForJob = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const hrUser = await getUserByStackId(req.user!.sub);
    if (!hrUser) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    if (hrUser.role !== "HR") {
      res.status(403).json({ success: false, message: "Only HR can view job applications" });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.userId !== hrUser.id) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const applications = await prisma.application.findMany({
      where: { jobId: job.id },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to list job applications",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getMyApplicationForShareId = async (req: Request<{ shareId: string }>, res: Response): Promise<void> => {
  try {
    const candidate = await getUserByStackId(req.user!.sub);
    if (!candidate) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    const job = await prisma.job.findUnique({ where: { shareId: req.params.shareId } });
    if (!job) {
      res.status(404).json({ success: false, message: "Job not found" });
      return;
    }

    const application = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        application,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch application",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
