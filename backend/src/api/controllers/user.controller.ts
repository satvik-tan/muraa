import type { Request, Response } from "express";
import { prisma } from "../../services/prisma.js";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["CANDIDATE", "HR"]),
});

async function getUserByStackId(stackUserId: string) {
  return prisma.user.findUnique({ where: { stackUserId } });
}

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
        hasCompletedRoleOnboarding: false,
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

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch current user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found — call /api/user/sync first" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: parsed.data.role,
        hasCompletedRoleOnboarding: true,
      },
    });

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update role",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
