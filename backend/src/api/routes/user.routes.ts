import express from "express";
import { stackAuthMiddleware } from "../../middleware/stackAuth.middleware.js";
import { syncUser } from "../controllers/user.controller.js";

const router = express.Router();

// All user routes require a valid Stack Auth token
router.use(stackAuthMiddleware);

// POST /api/user/sync — call this from the frontend right after signup/login
router.post("/sync", syncUser);

export default router;
