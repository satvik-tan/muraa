import express from "express";
import { stackAuthMiddleware } from "../../middleware/stackAuth.middleware.js";
import {
  createJob,
  listAvailableJobs,
  listJobs,
  deleteJob,
  getJobByShareId,
  getJobCandidates,
  updateJobStatus,
} from "../controllers/job.controller.js";
import { listApplicationsForJob } from "../controllers/application.controller.js";

const router = express.Router();

// Public — no auth required
router.get("/share/:shareId", getJobByShareId);

// All routes below require a valid Stack Auth token
router.use(stackAuthMiddleware);
router.get("/available", listAvailableJobs);
router.get("/", listJobs);
router.post("/", createJob);
router.delete("/:id", deleteJob);
router.patch("/:id/status", updateJobStatus);
router.get("/:id/candidates", getJobCandidates);
router.get("/:id/applications", listApplicationsForJob);

export default router;
