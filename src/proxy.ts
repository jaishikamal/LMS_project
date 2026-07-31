import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// Clerk's helper is unchanged: it attaches the auth state to every request so
// `auth()` works in server components, route handlers and server actions.
// Authorization itself is enforced next to the data (see src/lib/auth.ts).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk's frontend API proxy path
    "/__clerk/(.*)",
  ],
};
