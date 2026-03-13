import type * as jose from "jose";

// Augment the Express Request type globally so req.user is typed everywhere
declare global {
  namespace Express {
    interface Request {
      user?: jose.JWTPayload & {
        sub: string;       // Stack Auth user ID
        email?: string;
        name?: string;
      };
    }
  }
}

export {};
