/**
 * Roles supported by the LMS.
 *
 * A user's role lives on their Clerk `publicMetadata` (`{ "role": "admin" }`)
 * and is forwarded into the session token so it can be read without an extra
 * network request. Configure this once in the Clerk Dashboard under
 * Sessions -> Customize session token:
 *
 *   { "metadata": "{{user.public_metadata}}" }
 */
export const ROLES = ["admin", "teacher", "student", "parent"] as const;

export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** Landing route for each role, e.g. an admin lands on `/admin`. */
export const roleHomeRoute = (role: Role) => `/${role}` as const;
