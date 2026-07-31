import { getCurrentUser } from "@/lib/auth";
import { roleHomeRoute } from "@/lib/roles";
import { redirect } from "next/navigation";

/**
 * Entry point: routes each visitor to the dashboard matching their role.
 */
export default async function Home() {
  const { userId, role } = await getCurrentUser();

  if (!userId) redirect("/sign-in");
  if (role) redirect(roleHomeRoute(role));

  // Signed in, but no role assigned on the Clerk user yet.
  return (
    <div className="h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center flex flex-col gap-2">
        <h1 className="text-xl font-semibold">No role assigned</h1>
        <p className="text-sm text-gray-500">
          Your account has no role yet. An administrator needs to set
          <code className="mx-1 rounded bg-gray-100 px-1">
            {'{ "role": "admin" }'}
          </code>
          on your Clerk public metadata (admin, teacher, student, or parent).
        </p>
      </div>
    </div>
  );
}
