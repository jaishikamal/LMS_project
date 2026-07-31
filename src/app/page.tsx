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

  // Signed in, but the account isn't in any role table.
  return (
    <div className="h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center flex flex-col gap-2">
        <h1 className="text-xl font-semibold">No role assigned</h1>
        <p className="text-sm text-gray-500">
          This account doesn&apos;t match an Admin, Teacher, Student, or
          Parent record in the database.
        </p>
      </div>
    </div>
  );
}
