import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { prisma } from "../services/prisma.js";

// JWKS is created lazily on first request so dotenv has already run
let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
let projectId: string | null = null;

function getJwks() {
  if (jwks && projectId) return { jwks, projectId };

  projectId =
    process.env.STACK_PROJECT_ID ??
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID ??
    null;

  if (!projectId) return null;

  // Stack Auth JWKS endpoint
  jwks = jose.createRemoteJWKSet(
    new URL(
      `https://api.stack-auth.com/api/v1/projects/${projectId}/.well-known/jwks.json`
    )
  );
  return { jwks, projectId };
}

/**
 * Express middleware that verifies the Stack Auth access token sent by the client
 * in the `x-stack-access-token` request header.
 *
 * On success  → calls next() and attaches the decoded JWT payload to req.user
 * On failure  → returns 401 Unauthorized
 *
 * Client side usage:
 *   const { accessToken } = await user.getAuthJson();
 *   fetch('/api/...', { headers: { 'x-stack-access-token': accessToken } });
 */
export const stackAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const accessToken = req.headers["x-stack-access-token"] ?? req.headers.authorization?.replace(/^Bearer\s+/i, "");
  // Log presence of access token for debugging (do not log the full token in production)
  if (!accessToken || typeof accessToken !== "string") {
    console.log("stackAuthMiddleware: missing x-stack-access-token header");
    res.status(401).json({ success: false, message: "Unauthorized: missing access token" });
    return;
  } else {
    try {
      // token may be long; log only length to avoid leaking secrets
      console.log(`stackAuthMiddleware: received access token (length=${(accessToken as string).length})`);
    } catch {}
  }

  try {
    const payload = await verifyStackAccessToken(accessToken);
    // Attach the verified user payload so downstream handlers can access req.user
    req.user = payload as Request["user"];
    next();
  } catch (err) {
    console.log("stackAuthMiddleware: token verification failed", err instanceof Error ? err.message : String(err));
    res.status(401).json({ success: false, message: "Unauthorized: invalid or expired token" });
  }
};

export async function verifyStackAccessToken(accessToken: string): Promise<jose.JWTPayload> {
  const jwksConfig = getJwks();
  if (!jwksConfig) {
    throw new Error("Server misconfiguration: missing Stack project ID");
  }

  const { payload } = await jose.jwtVerify(accessToken, jwksConfig.jwks, {
    audience: jwksConfig.projectId,
  });

  return payload;
}

export function requireRole(requiredRole: "CANDIDATE" | "HR") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stackUserId = req.user?.sub;
      if (!stackUserId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { stackUserId },
        select: { role: true },
      });

      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      if (user.role !== requiredRole) {
        res.status(403).json({ success: false, message: `Forbidden: ${requiredRole} role required` });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Role check failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
