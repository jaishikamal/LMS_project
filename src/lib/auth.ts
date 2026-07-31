import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isRole, roleHomeRoute, type Role } from "./roles";

/**
 * Reads the current user's id, name and role from the NextAuth session.
 * Wrapped in `cache()` so the layout, navbar and page share one call per
 * request instead of re-decoding the session token multiple times.
 *
 * Returns `role: null` when the user is signed out or has no role on the
 * session (shouldn't happen for accounts created through the seed/DB, since
 * every account row belongs to exactly one role table).
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return { userId: null, name: null, role: null };

  return {
    userId: user.id,
    name: user.name ?? null,
    role: isRole(user.role) ? user.role : null,
  };
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
