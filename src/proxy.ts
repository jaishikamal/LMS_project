export { auth as proxy } from "@/auth";

// Next.js 16 renamed the `middleware` file convention to `proxy` (and the
// exported function from `middleware` to `proxy`). Re-exporting `auth`
// attaches the session to every matched request so `auth()` works in server
// components, route handlers and server actions.
// Authorization itself is enforced next to the data (see src/lib/auth.ts) --
// no `authorized` callback is defined here on purpose.
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
