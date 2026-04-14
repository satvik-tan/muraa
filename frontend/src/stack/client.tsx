import { StackClientApp } from "@stackframe/stack";

const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

export const stackClientApp = projectId
  ? new StackClientApp({
      tokenStore: "nextjs-cookie",
      projectId,
      publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
      urls: {
        afterSignIn: "/dashboard",
        afterSignUp: "/dashboard",
      },
    })
  : null;
