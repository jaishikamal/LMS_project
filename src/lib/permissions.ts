import type { Role } from "./roles";
import prisma from "./prisma";

/**
 * Catalog of every capability in the LMS. Keys are stable identifiers used by
 * the sidebar menu, server guards and the RBAC controller; they mirror the
 * current hard-coded role access exactly. A key is either a `view` permission
 * (read access, usually drives a menu item) or a `manage` permission (mutating
 * server actions), grouped by module via `category`.
 */
export const PERMISSIONS = {
  // SYSTEM
  "home.view": { label: "Access Home", category: "System" },
  "profile.view": { label: "View Profile", category: "System" },
  "audit.view": { label: "View Audit Log", category: "System" },
  "settings.manage": { label: "Manage Settings", category: "System" },
  "permissions.manage": { label: "Manage Permissions", category: "System" },
  "relationships.view": { label: "View Relationships", category: "System" },
  // ACADEMIC
  "classes.view": { label: "View Classes", category: "Academic" },
  "classes.manage": { label: "Manage Classes", category: "Academic" },
  "subjects.view": { label: "View Subjects", category: "Academic" },
  "subjects.manage": { label: "Manage Subjects", category: "Academic" },
  "classSubjects.view": { label: "View Class Subjects", category: "Academic" },
  "classSubjects.manage": { label: "Manage Class Subjects", category: "Academic" },
  "exams.view": { label: "View Exams", category: "Academic" },
  "exams.manage": { label: "Manage Exams", category: "Academic" },
  "assignments.view": { label: "View Assignments", category: "Academic" },
  "assignments.manage": { label: "Manage Assignments", category: "Academic" },
  "results.view": { label: "View Results", category: "Academic" },
  "results.manage": { label: "Manage Results", category: "Academic" },
  "halltickets.view": { label: "View Hall Tickets", category: "Academic" },
  "reports.view": { label: "View Reports", category: "Academic" },
  "attendance.view": { label: "View Attendance", category: "Academic" },
  "attendance.manage": { label: "Manage Attendance", category: "Academic" },
  "timetable.view": { label: "View Timetable", category: "Academic" },
  "timetable.manage": { label: "Manage Timetable", category: "Academic" },
  "lessons.view": { label: "View Lesson Plans", category: "Academic" },
  "lessons.manage": { label: "Manage Lesson Plans", category: "Academic" },
  "logbook.view": { label: "View Logbook", category: "Academic" },
  "logbook.manage": { label: "Manage Logbook", category: "Academic" },
  "periods.manage": { label: "Manage Periods", category: "Academic" },
  "events.view": { label: "View Events", category: "Academic" },
  "events.manage": { label: "Manage Events", category: "Academic" },
  "announcements.view": { label: "View Announcements", category: "Academic" },
  "announcements.manage": { label: "Manage Announcements", category: "Academic" },
  // PEOPLE
  "teachers.view": { label: "View Teachers", category: "People" },
  "teachers.manage": { label: "Manage Teachers", category: "People" },
  "students.view": { label: "View Students", category: "People" },
  "students.manage": { label: "Manage Students", category: "People" },
  "parents.view": { label: "View Parents", category: "People" },
  "parents.manage": { label: "Manage Parents", category: "People" },
  "guardians.view": { label: "View Guardians", category: "People" },
  "guardians.manage": { label: "Manage Guardians", category: "People" },
  "staff.view": { label: "View Staff", category: "People" },
  "staff.manage": { label: "Manage Staff", category: "People" },
  "staff.attendance.view": { label: "View Staff Attendance", category: "People" },
  "staff.attendance.manage": { label: "Manage Staff Attendance", category: "People" },
  "staff.performance.view": { label: "View Staff Performance", category: "People" },
  "staff.performance.manage": { label: "Manage Staff Performance", category: "People" },
  // FINANCE
  "fees.view": { label: "View Fees", category: "Finance" },
  "fees.manage": { label: "Manage Fees", category: "Finance" },
  "invoices.view": { label: "View Invoices", category: "Finance" },
  "invoices.manage": { label: "Manage Invoices", category: "Finance" },
  "payments.view": { label: "View Payments", category: "Finance" },
  "payments.manage": { label: "Manage Payments", category: "Finance" },
  "salaries.view": { label: "View Salaries", category: "Finance" },
  "salaries.manage": { label: "Manage Salaries", category: "Finance" },
  "expenses.view": { label: "View Expenses", category: "Finance" },
  "expenses.manage": { label: "Manage Expenses", category: "Finance" },
  // COMMUNICATION
  "notifications.view": { label: "View Notifications", category: "Communication" },
  "notifications.manage": { label: "Manage Notifications", category: "Communication" },
  "messages.view": { label: "View Messages", category: "Communication" },
  "messages.send": { label: "Send Messages", category: "Communication" },
  "chat.view": { label: "View Chat Rooms", category: "Communication" },
  // INVENTORY
  "inventory.view": { label: "View Inventory", category: "Inventory" },
  "inventory.manage": { label: "Manage Inventory", category: "Inventory" },
  "inventory.issue.manage": { label: "Manage Issue & Return", category: "Inventory" },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export const PERMISSION_CATEGORIES = Array.from(
  new Set(PERMISSION_KEYS.map((key) => PERMISSIONS[key].category))
);

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

export const roleLabel = (role: Role) => ROLE_LABELS[role];

/**
 * Reads the permission keys currently assigned to a role. Called on every
 * layout/menu render, so it stays a single indexed lookup on the composite
 * primary key.
 */
export const getRolePermissions = async (
  role: Role
): Promise<PermissionKey[]> => {
  const rows = await prisma.rolePermission.findMany({
    where: { role },
    select: { permissionKey: true },
  });
  return rows.map((row) => row.permissionKey as PermissionKey);
};

/** True when `role` holds `permission` in the DB. */
export const hasPermission = async (
  role: Role,
  permission: PermissionKey
): Promise<boolean> => {
  const found = await prisma.rolePermission.findUnique({
    where: {
      role_permissionKey: { role, permissionKey: permission },
    },
    select: { role: true },
  });
  return found !== null;
};

/** All permission keys a role currently holds, as a Set for cheap lookups. */
export const getRolePermissionSet = async (role: Role) =>
  new Set<PermissionKey>(await getRolePermissions(role));
