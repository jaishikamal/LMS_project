/**
 * Roles supported by the LMS.
 *
 * A user's role is derived from which table their account row lives in
 * (Admin, Teacher, Student or Parent) and is attached to the NextAuth JWT/
 * session in `src/auth.ts`.
 */
export const ROLES = ["admin", "teacher", "student", "parent"] as const;

export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** Landing route for each role, e.g. an admin lands on `/admin`. */
export const roleHomeRoute = (role: Role) => `/${role}` as const;
