import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";

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
    const jwksConfig = getJwks();
    if (!jwksConfig) {
      console.log(
        "stackAuthMiddleware: missing STACK_PROJECT_ID (or NEXT_PUBLIC_STACK_PROJECT_ID) in backend environment"
      );
      res.status(500).json({
        success: false,
        message: "Server misconfiguration: missing Stack project ID",
      });
      return;
    }

    const { payload } = await jose.jwtVerify(accessToken, jwksConfig.jwks, {
      // aud = project ID per Stack Auth JWT spec
      audience: jwksConfig.projectId,
    });
    // Attach the verified user payload so downstream handlers can access req.user
    req.user = payload as Request["user"];
    next();
  } catch (err) {
    console.log("stackAuthMiddleware: token verification failed", err instanceof Error ? err.message : String(err));
    res.status(401).json({ success: false, message: "Unauthorized: invalid or expired token" });
  }
};
