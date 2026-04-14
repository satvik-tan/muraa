import express from "express";
import { stackAuthMiddleware } from "../../middleware/stackAuth.middleware.js";
import {
  createJob,
  listJobs,
  deleteJob,
  getJobByShareId,
  getJobCandidates,
  evaluateCandidateSession,
  evaluateCandidateSessionPublic,
} from "../controllers/job.controller.js";

const router = express.Router();

// Public — no auth required
router.get("/share/:shareId", getJobByShareId);
router.post("/public/evaluate/:sessionId", evaluateCandidateSessionPublic);

// All routes below require a valid Stack Auth token
router.use(stackAuthMiddleware);
router.get("/", listJobs);
router.post("/", createJob);
router.delete("/:id", deleteJob);
router.get("/:id/candidates", getJobCandidates);
router.post("/:id/candidates/:sessionId/evaluate", evaluateCandidateSession);

export default router;
