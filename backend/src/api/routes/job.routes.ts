import express from "express";
import { stackAuthMiddleware } from "../../middleware/stackAuth.middleware.js";
import {
  createJob,
  listJobs,
  deleteJob,
  getJobByShareId,
  applyToJobByShareId,
  getShareLinkAccessByShareId,
  createCandidateSessionByShareId,
  getJobCandidates,
  getJobApplications,
  approveJobApplication,
} from "../controllers/job.controller.js";

const router = express.Router();

// Public — no auth required
router.get("/share/:shareId", getJobByShareId);

// All routes below require a valid Stack Auth token
router.use(stackAuthMiddleware);
router.get("/share/:shareId/access", getShareLinkAccessByShareId);
router.post("/share/:shareId/apply", applyToJobByShareId);
router.post("/share/:shareId/candidates", createCandidateSessionByShareId);
router.get("/", listJobs);
router.post("/", createJob);
router.delete("/:id", deleteJob);
router.get("/:id/candidates", getJobCandidates);
router.get("/:id/applications", getJobApplications);
router.post("/:id/applications/:applicationId/approve", approveJobApplication);

export default router;
