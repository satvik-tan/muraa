import express from "express";
import { stackAuthMiddleware } from "../../middleware/stackAuth.middleware.js";
import { syncUser, getCurrentUser, updateRole } from "../controllers/user.controller.js";

const router = express.Router();

// All user routes require a valid Stack Auth token
router.use(stackAuthMiddleware);

// POST /api/user/sync — call this from the frontend right after signup/login
router.post("/sync", syncUser);
router.get("/me", getCurrentUser);
router.patch("/role", updateRole);

export default router;
