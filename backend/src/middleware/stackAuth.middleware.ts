import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";

// Cache the JWKS so it is reused across requests (jose handles refresh internally)
const jwks = jose.createRemoteJWKSet(
  new URL(
    `https://api.stack-auth.com/api/v1/projects/${process.env.STACK_PROJECT_ID}/.well-known/jwks.json`
  )
);

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
  const accessToken = req.headers["x-stack-access-token"];

  if (!accessToken || typeof accessToken !== "string") {
    res.status(401).json({ success: false, message: "Unauthorized: missing access token" });
    return;
  }

  try {
    const { payload } = await jose.jwtVerify(accessToken, jwks);
    // Attach the verified user payload so downstream handlers can access req.user
    req.user = payload as Request["user"];
    next();
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized: invalid or expired token" });
  }
};

