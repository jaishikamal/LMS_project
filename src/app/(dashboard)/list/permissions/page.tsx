import PermissionController from "@/components/PermissionController";
import { requirePermission } from "@/lib/auth";
import {
  PERMISSION_KEYS,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/roles";

const PermissionPage = async () => {
  await requirePermission("permissions.manage");

  const rows = await prisma.rolePermission.findMany();

  const assignments: Record<string, PermissionKey[]> = {};
  for (const role of ROLES) assignments[role] = [];

  for (const row of rows) {
    if (assignments[row.role]) assignments[row.role].push(row.permissionKey as PermissionKey);
  }

  const categories = Array.from(
    new Set(PERMISSION_KEYS.map((key) => PERMISSIONS[key].category))
  );

  return (
    <PermissionController
      roles={[...ROLES] as Role[]}
      categories={categories}
      permissions={PERMISSION_KEYS.map((key) => ({
        key,
        label: PERMISSIONS[key].label,
        category: PERMISSIONS[key].category,
      }))}
      assignments={assignments}
    />
  );
};

export default PermissionPage;
