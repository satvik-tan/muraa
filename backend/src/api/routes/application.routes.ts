import express from "express";
import { stackAuthMiddleware, requireRole } from "../../middleware/stackAuth.middleware.js";
import {
  createApplication,
  listMyApplications,
  updateApplicationStatus,
  getMyApplicationForShareId,
} from "../controllers/application.controller.js";

const router = express.Router();

router.use(stackAuthMiddleware);

router.get("/me", requireRole("CANDIDATE"), listMyApplications);
router.get("/job-share/:shareId/me", requireRole("CANDIDATE"), getMyApplicationForShareId);
router.post("/", requireRole("CANDIDATE"), createApplication);
router.patch("/:id/status", requireRole("HR"), updateApplicationStatus);

export default router;
