export { };

/**
 * The roles supported by the LMS. Stored on the Clerk user's `publicMetadata`
 * and forwarded into the session token through the "Customize session token"
 * claims in the Clerk Dashboard:
 *
 * { "metadata": "{{user.public_metadata}}" }
 */
export type Role = "admin" | "teacher" | "student" | "parent";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Role;
    };
  }
}
