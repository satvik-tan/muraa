import type { Request, Response } from "express";
import { prisma } from "../../services/prisma.js";

/**
 * POST /api/user/sync
 *
 * Called by the frontend immediately after signup (or login).
 * Uses the verified JWT payload already attached to req.user by stackAuthMiddleware
 * to upsert the user into our database.
 *
 * - stackUserId  → req.user.sub   (Stack Auth's unique user ID)
 * - email        → req.user.email
 * - name         → req.user.name  (optional)
 */
export const syncUser = async (req: Request, res: Response): Promise<void> => {
  console.log(`syncUser: called ${req.method} ${req.path}`);
  console.log("syncUser: req.user=", req.user);

  const { sub: stackUserId, email, name } = req.user!;

  if (!email) {
    res.status(400).json({ success: false, message: "No email found in token" });
    return;
  }

  try {
    const user = await prisma.user.upsert({
      where: { stackUserId },
      // On subsequent logins — keep email & name fresh
      update: {
        email,
        name: name ?? null,
      },
      // First signup — populate every field
      create: {
        stackUserId,
        email,
        name: name ?? null,
        createdAt: new Date(),
      },
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to sync user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
