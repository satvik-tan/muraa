import type { Request, Response } from "express";
import { prisma } from "../../services/prisma.js";

/** Resolve the Stack Auth JWT subject to the DB User row */
async function getUserByStackId(stackUserId: string) {
  return prisma.user.findUnique({ where: { stackUserId } });
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
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
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
export const getJobByShareId = async (req: Request, res: Response): Promise<void> => {
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

// GET /api/jobs/:id/candidates
export const getJobCandidates = async (req: Request, res: Response): Promise<void> => {
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
