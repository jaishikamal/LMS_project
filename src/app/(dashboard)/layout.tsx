import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import ToastProvider from "@/components/ToastProvider";
import { requireRole } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions";
import { ROLES } from "@/lib/roles";
import { getSchoolSettings } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Every dashboard route requires a signed-in user with a known role.
  const { role } = await requireRole(ROLES);

  // The sidebar shows only the menu items the role's permissions allow.
  const permissions = await getRolePermissions(role);

  // Branding comes from Settings (school name + logo), with fallbacks.
  const school = await getSchoolSettings();

  return (
    <div className="h-screen flex">
      {/* /* LEFT */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 flex flex-col min-h-0">
        <div className="mb-6 flex items-center justify-center lg:justify-start gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={school.logo}
              alt="School logo"
              width={40}
              height={40}
              className="w-10 h-auto rounded-sm"
              loading="eager"
            />
            <span className="hidden lg:block text-lg font-semibold truncate max-w-[8rem]">
              {school.schoolName}
            </span>
          </Link>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Menu permissions={permissions} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
      <ToastProvider />
    </div>
  );
}
