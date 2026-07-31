import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isRole, roleHomeRoute, type Role } from "./roles";

/**
 * The signed-in Clerk user, fetched at most once per request.
 * `currentUser()` calls Clerk's API, so it is wrapped in `cache()` to dedupe
 * the calls made by the layout, the navbar and the page in a single render.
 */
export const getClerkUser = cache(async () => currentUser());

/**
 * Reads the current user's id and role on the server.
 *
 * The role lives on the Clerk user's `publicMetadata`. It is read straight from
 * the session token when the instance forwards it (Clerk Dashboard -> Sessions
 * -> Customize session token -> `{ "metadata": "{{user.public_metadata}}" }`),
 * which needs no network call. When that claim isn't configured we fall back to
 * fetching the user, so roles work either way.
 *
 * Returns `role: null` when the user is signed out or has no role assigned.
 */
export const getCurrentUser = cache(async () => {
  const { userId, sessionClaims } = await auth();

  if (!userId) return { userId: null, role: null };

  const claimedRole = sessionClaims?.metadata?.role;
  if (isRole(claimedRole)) return { userId, role: claimedRole };

  const user = await getClerkUser();
  const metadataRole = user?.publicMetadata?.role;

  return { userId, role: isRole(metadataRole) ? metadataRole : null };
});

/** Same as `getCurrentUser`, but only returns the role. */
export const getRole = async () => (await getCurrentUser()).role;

/**
 * Guards a server component: requires a signed-in user whose role is in
 * `allowedRoles`. Unauthenticated users go to the sign-in page, authenticated
 * users without the right role go to their own dashboard.
 */
export const requireRole = async (allowedRoles: readonly Role[]) => {
  const { userId, role } = await getCurrentUser();

  if (!userId) redirect("/sign-in");
  if (!role) redirect("/");
  if (!allowedRoles.includes(role)) redirect(roleHomeRoute(role));

  return { userId, role };
};
