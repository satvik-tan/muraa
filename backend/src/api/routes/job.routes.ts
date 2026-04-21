import express from "express";
import { stackAuthMiddleware } from "../../middleware/stackAuth.middleware.js";
import {
  createJob,
  listJobs,
  deleteJob,
  getJobByShareId,
  createCandidateSessionByShareId,
  getJobCandidates,
} from "../controllers/job.controller.js";

const router = express.Router();

// Public — no auth required
router.get("/share/:shareId", getJobByShareId);
router.post("/share/:shareId/candidates", createCandidateSessionByShareId);

// All routes below require a valid Stack Auth token
router.use(stackAuthMiddleware);
router.get("/", listJobs);
router.post("/", createJob);
router.delete("/:id", deleteJob);
router.get("/:id/candidates", getJobCandidates);

export default router;
