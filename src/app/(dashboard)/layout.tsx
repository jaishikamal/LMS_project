import SidebarContainer from "@/components/SidebarContainer";
import Navbar from "@/components/Navbar";
import ToastProvider from "@/components/ToastProvider";
import { requireRole } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions";
import { ROLES } from "@/lib/roles";
import { getSchoolSettings } from "@/lib/settings";

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
    <SidebarContainer
      permissions={permissions}
      schoolName={school.schoolName || "Everest College"}
      schoolLogo={school.logo}
    >
      <Navbar />
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      <ToastProvider />
    </SidebarContainer>
  );
}
