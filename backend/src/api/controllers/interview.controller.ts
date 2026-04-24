// Example controller for handling interview logic
// Business logic should be separated from routes
// Example controller for handling interview logic
// Business logic should be separated from routes
import type { Request, Response } from "express";
import { prisma } from "../../services/prisma.js";

export const startInterview = (req:Request, res:Response) => {
  try {
    // Add interview logic here
    res.status(200).json({
      success: true,
      message: 'Interview initialized successfully',
      data: {
        interviewId: Date.now(),
        startTime: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start interview',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getQuestions = (req:Request, res:Response) => {
  try {
    // Add logic to fetch questions
    const questions = [
      { id: 1, text: 'Tell me about yourself', category: 'general' },
      { id: 2, text: 'What are your strengths?', category: 'behavioral' }
    ];
    
    res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getInterviewAccess = async (req: Request<{ shareId: string }>, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { stackUserId: req.user!.sub } });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    if (user.role !== "CANDIDATE") {
      res.status(403).json({ success: false, message: "Only candidates can access interviews" });
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
          candidateId: user.id,
          jobId: job.id,
        },
      },
    });

    if (!application) {
      res.status(403).json({ success: false, message: "Apply to this job before starting the interview" });
      return;
    }

    if (application.status !== "APPROVED") {
      res.status(403).json({
        success: false,
        message: "Interview access is locked until HR approves your application",
        data: { applicationStatus: application.status },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        applicationId: application.id,
        applicationStatus: application.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to validate interview access",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
