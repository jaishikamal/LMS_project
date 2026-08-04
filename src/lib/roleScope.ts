import { getCurrentUser } from "./auth";
import prisma from "./prisma";
import type { Role } from "./roles";

export type RoleScope = {
  role: Role | null;
  userId: string | null;
  // Class ids the current user is scoped to (their own class, the classes
  // they teach/supervise, or their children's classes). Null means "no
  // restriction" (admin, or no session).
  classIds: number[] | null;
  // Student ids the current user is scoped to (themselves, their children,
  // or the students in their classes). Null means "no restriction".
  studentIds: string[] | null;
};

/**
 * Computes the data scope for the current session so list pages can filter
 * Prisma queries by role:
 *  - admin: unrestricted (classIds/studentIds are null)
 *  - teacher: the classes they supervise or teach a subject in (ClassSubject)
 *    and the students in them
 *  - student: their own class and themselves
 *  - parent: their children's classes and their children
 */
export const getRoleScope = async (): Promise<RoleScope> => {
  const { userId, role } = await getCurrentUser();

  if (!userId || !role || role === "admin") {
    return { role, userId, classIds: null, studentIds: null };
  }

  if (role === "teacher") {
    // A teacher's classes are the ones they supervise (homeroom) plus the
    // classes where they teach a subject (via ClassSubject).
    const [supervised, taught] = await Promise.all([
      prisma.class.findMany({
        where: { supervisorId: userId },
        select: { id: true },
      }),
      prisma.classSubject.findMany({
        where: { teacherId: userId },
        select: { classId: true },
      }),
    ]);
    const classIds = Array.from(
      new Set([...supervised.map((c) => c.id), ...taught.map((c) => c.classId)])
    );
    const students = classIds.length
      ? await prisma.student.findMany({
        where: { classId: { in: classIds } },
        select: { id: true },
      })
      : [];
    return { role, userId, classIds, studentIds: students.map((s) => s.id) };
  }

  if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { classId: true },
    });
    return {
      role,
      userId,
      classIds: student ? [student.classId] : [],
      studentIds: [userId],
    };
  }

  if (role === "parent") {
    const children = await prisma.student.findMany({
      where: { parentId: userId },
      select: { id: true, classId: true },
    });
    return {
      role,
      userId,
      classIds: Array.from(new Set(children.map((c) => c.classId))),
      studentIds: children.map((c) => c.id),
    };
  }

  return { role, userId, classIds: null, studentIds: null };
};

/**
 * ANDs a role-based restriction into an existing `where` clause's `AND`
 * array in place, without letting a URL query param that targets the same
 * field (e.g. `classId`) silently override or be overridden by it.
 */
export const applyRoleCondition = <T extends { AND?: T | T[] }>(
  where: T,
  roleCondition: T | null
): void => {
  if (!roleCondition) return;
  const existing = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  where.AND = [...existing, roleCondition] as T[];
};
