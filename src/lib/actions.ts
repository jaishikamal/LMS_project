"use server";

import bcrypt from "bcryptjs";
import { refresh, revalidatePath } from "next/cache";
import type { ActionState } from "./actionState";
import { getCurrentUser, requirePermission } from "./auth";
import {
  assignmentSchema,
  attendanceSchema,
  classSchema,
  classSubjectSchema,
  examSchema,
  expenseSchema,
  feeItemSchema,
  guardianSchema,
  invoiceSchema,
  inventoryIssueSchema,
  inventoryItemSchema,
  lessonSchema,
  logbookEntrySchema,
  messageSchema,
  notificationSchema,
  parentSchema,
  paymentSchema,
  periodSchema,
  resultSchema,
  salaryRecordSchema,
  settingsSchema,
  staffAttendanceSchema,
  staffPerformanceSchema,
  staffSchema,
  studentSchema,
  subjectSchema,
  teacherSchema,
  timetableSlotSchema,
  eventSchema,
  announcementSchema,
  type AssignmentSchema,
  type AttendanceSchema,
  type ClassSchema,
  type ClassSubjectSchema,
  type ExamSchema,
  type ExpenseSchema,
  type FeeItemSchema,
  type GuardianSchema,
  type InvoiceSchema,
  type InventoryIssueSchema,
  type InventoryItemSchema,
  type LessonSchema,
  type LogbookEntrySchema,
  type MessageSchema,
  type NotificationSchema,
  type ParentSchema,
  type PaymentSchema,
  type PeriodSchema,
  type ResultSchema,
  type SalaryRecordSchema,
  type SettingsSchema,
  type StaffAttendanceSchema,
  type StaffPerformanceSchema,
  type StaffSchema,
  type StudentSchema,
  type SubjectSchema,
  type TeacherSchema,
  type TimetableSlotSchema,
  type EventSchema,
  type AnnouncementSchema,
} from "./formSchemas";
import prisma from "./prisma";
import { type PermissionKey } from "./permissions";
import { getRoleScope } from "./roleScope";
import { type Role } from "./roles";

/** Blank strings must become `null` so Prisma's nullable unique columns don't collide on "". */
const nullIfBlank = (value: string | undefined) =>
  value && value.trim() !== "" ? value.trim() : null;

const hash = (plain: string) => bcrypt.hash(plain, 10);

const failure = (error: string): ActionState => ({ success: false, error });

/**
 * Appends a row to the audit trail. Runs best-effort on purpose: a logging
 * failure must never fail the mutation it is auditing.
 */
const logAudit = async (
  entity: string,
  entityId: string | number,
  action: "create" | "update" | "delete",
  details?: string
): Promise<void> => {
  const { userId, role } = await getCurrentUser();
  if (!userId || !role) return;
  try {
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: role,
        action,
        entity,
        entityId: String(entityId),
        details: details || null,
      },
    });
  } catch {
    // Ignore; the primary operation is already committed.
  }
};

/** Turns Prisma's unique-constraint error into a message naming the field. */
const describeError = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  if (code === "P2002") {
    const target = (error as { meta?: { target?: unknown } })?.meta?.target;
    const fields = Array.isArray(target) ? target.join(", ") : "field";
    return `That ${fields} is already taken.`;
  }
  // A delete blocked by a foreign key: the row is still referenced elsewhere
  // (e.g. a class with students in it).
  if (code === "P2003") {
    return "This record is still linked to other data, so it can't be deleted. Remove those links first.";
  }
  if (code === "P2025") {
    return "That record no longer exists. Refresh and try again.";
  }
  console.error(error);
  return "Something went wrong. Please try again.";
};

// TEACHER ---------------------------------------------------------------

export const saveTeacher = async (
  _prev: ActionState,
  payload: TeacherSchema
): Promise<ActionState> => {
  await requirePermission("teachers.manage");

  const parsed = teacherSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const common = {
      username: data.username,
      name: data.name,
      surname: data.surname,
      email: nullIfBlank(data.email),
      phone: nullIfBlank(data.phone),
      address: data.address,
      bloodType: data.bloodType,
      sex: data.sex,
      birthday: data.birthday,
      img: nullIfBlank(data.img),
    };

    if (data.id) {
      await prisma.teacher.update({
        where: { id: data.id },
        data: {
          ...common,
          // Empty password on update means "keep the current one".
          ...(data.password ? { password: await hash(data.password) } : {}),
          subjects: data.subjects
            ? { set: data.subjects.map((id) => ({ id })) }
            : undefined,
        },
      });
    } else {
      if (!data.password) return failure("Password is required for a new teacher.");
      await prisma.teacher.create({
        data: {
          ...common,
          id: crypto.randomUUID(),
          password: await hash(data.password),
          subjects: data.subjects
            ? { connect: data.subjects.map((id) => ({ id })) }
            : undefined,
        },
      });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/teachers");
  return { success: true, error: null };
};

export const deleteTeacher = async (id: string): Promise<ActionState> => {
  await requirePermission("teachers.manage");
  try {
    await prisma.teacher.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/teachers");
  return { success: true, error: null };
};

export const deleteInventoryIssue = async (id: number): Promise<ActionState> => {
  await requirePermission("inventory.issue.manage");
  try {
    await prisma.inventoryIssue.delete({ where: { id } });
    await logAudit("InventoryIssue", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/inventory/issues");
  return { success: true, error: null };
};

// SYSTEM --------------------------------------------------------------------

export const saveSettings = async (
  _prev: ActionState,
  payload: SettingsSchema
): Promise<ActionState> => {
  await requirePermission("settings.manage");

  const parsed = settingsSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    await prisma.$transaction(
      Object.entries(data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
    await logAudit("Setting", "settings", "update");
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/settings");
  // School name + logo render in the sidebar layout, so refresh the whole tree.
  revalidatePath("/", "layout");
  refresh();
  return { success: true, error: null };
};

// INVENTORY -----------------------------------------------------------------

export const saveInventoryItem = async (
  _prev: ActionState,
  payload: InventoryItemSchema
): Promise<ActionState> => {
  await requirePermission("inventory.manage");

  const parsed = inventoryItemSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      location: data.location || null,
      description: data.description || null,
    };
    if (data.id) {
      await prisma.inventoryItem.update({ where: { id: data.id }, data: values });
      await logAudit("InventoryItem", data.id, "update", data.name);
    } else {
      const created = await prisma.inventoryItem.create({ data: values });
      await logAudit("InventoryItem", created.id, "create", data.name);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/inventory");
  return { success: true, error: null };
};

export const deleteInventoryItem = async (id: number): Promise<ActionState> => {
  await requirePermission("inventory.manage");
  try {
    await prisma.inventoryItem.delete({ where: { id } });
    await logAudit("InventoryItem", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/inventory");
  return { success: true, error: null };
};

export const saveInventoryIssue = async (
  _prev: ActionState,
  payload: InventoryIssueSchema
): Promise<ActionState> => {
  await requirePermission("inventory.issue.manage");

  const parsed = inventoryIssueSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
      select: { id: true },
    });
    if (!item) return failure("The selected inventory item no longer exists.");

    const values = {
      itemId: data.itemId,
      borrowerType: data.borrowerType,
      borrowerName: data.borrowerName,
      issuedDate: startOfDay(data.issuedDate),
      dueDate: startOfDay(data.dueDate),
      returnedDate: data.returnedDate ? startOfDay(data.returnedDate) : null,
      notes: data.notes || null,
    };
    if (data.id) {
      await prisma.inventoryIssue.update({ where: { id: data.id }, data: values });
      await logAudit("InventoryIssue", data.id, "update", data.borrowerName);
    } else {
      const created = await prisma.inventoryIssue.create({ data: values });
      await logAudit("InventoryIssue", created.id, "create", data.borrowerName);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/inventory/issues");
  return { success: true, error: null };
};

// STUDENT ---------------------------------------------------------------

export const saveStudent = async (
  _prev: ActionState,
  payload: StudentSchema
): Promise<ActionState> => {
  await requirePermission("students.manage");

  const parsed = studentSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    // Don't let a class be enrolled past its capacity.
    const target = await prisma.class.findUnique({
      where: { id: data.classId },
      select: { capacity: true, _count: { select: { students: true } } },
    });
    if (!target) return failure("The selected class no longer exists.");

    const isNewEnrolment =
      !data.id ||
      (await prisma.student.findUnique({
        where: { id: data.id },
        select: { classId: true },
      }))?.classId !== data.classId;

    if (isNewEnrolment && target._count.students >= target.capacity) {
      return failure("That class is already at full capacity.");
    }

    const common = {
      username: data.username,
      name: data.name,
      surname: data.surname,
      email: nullIfBlank(data.email),
      phone: nullIfBlank(data.phone),
      address: data.address,
      bloodType: data.bloodType,
      sex: data.sex,
      birthday: data.birthday,
      img: nullIfBlank(data.img),
      gradeId: data.gradeId,
      classId: data.classId,
      parentId: data.parentId,
    };

    if (data.id) {
      await prisma.student.update({
        where: { id: data.id },
        data: {
          ...common,
          ...(data.password ? { password: await hash(data.password) } : {}),
        },
      });
    } else {
      if (!data.password) return failure("Password is required for a new student.");
      await prisma.student.create({
        data: { ...common, id: crypto.randomUUID(), password: await hash(data.password) },
      });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/students");
  return { success: true, error: null };
};

export const deleteStudent = async (id: string): Promise<ActionState> => {
  await requirePermission("students.manage");
  try {
    await prisma.student.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/students");
  return { success: true, error: null };
};

// SUBJECT ---------------------------------------------------------------

export const saveSubject = async (
  _prev: ActionState,
  payload: SubjectSchema
): Promise<ActionState> => {
  await requirePermission("subjects.manage");

  const parsed = subjectSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    if (data.id) {
      await prisma.subject.update({
        where: { id: data.id },
        data: {
          name: data.name,
          teachers: data.teachers
            ? { set: data.teachers.map((id) => ({ id })) }
            : undefined,
        },
      });
    } else {
      await prisma.subject.create({
        data: {
          name: data.name,
          teachers: data.teachers
            ? { connect: data.teachers.map((id) => ({ id })) }
            : undefined,
        },
      });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/subjects");
  return { success: true, error: null };
};

export const deleteSubject = async (id: number): Promise<ActionState> => {
  await requirePermission("subjects.manage");
  try {
    await prisma.subject.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/subjects");
  return { success: true, error: null };
};

// CLASS -----------------------------------------------------------------

export const saveClass = async (
  _prev: ActionState,
  payload: ClassSchema
): Promise<ActionState> => {
  await requirePermission("classes.manage");

  const parsed = classSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      name: data.name,
      capacity: data.capacity,
      gradeId: data.gradeId,
      supervisorId: nullIfBlank(data.supervisorId),
    };

    if (data.id) {
      await prisma.class.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.class.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/classes");
  return { success: true, error: null };
};

export const deleteClass = async (id: number): Promise<ActionState> => {
  await requirePermission("classes.manage");
  try {
    await prisma.class.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/classes");
  return { success: true, error: null };
};

// CLASS SUBJECT ----------------------------------------------------------

export const saveClassSubject = async (
  _prev: ActionState,
  payload: ClassSubjectSchema
): Promise<ActionState> => {
  await requirePermission("classSubjects.manage");

  const parsed = classSubjectSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      subjectId: data.subjectId,
      classId: data.classId,
      teacherId: data.teacherId,
    };

    if (data.id) {
      await prisma.classSubject.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.classSubject.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/classSubjects");
  return { success: true, error: null };
};

export const deleteClassSubject = async (id: number): Promise<ActionState> => {
  await requirePermission("classSubjects.manage");
  try {
    await prisma.classSubject.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/classSubjects");
  return { success: true, error: null };
};

// PARENT ----------------------------------------------------------------

export const saveParent = async (
  _prev: ActionState,
  payload: ParentSchema
): Promise<ActionState> => {
  await requirePermission("parents.manage");

  const parsed = parentSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const common = {
      username: data.username,
      name: data.name,
      surname: data.surname,
      email: nullIfBlank(data.email),
      phone: data.phone,
      address: data.address,
    };

    if (data.id) {
      await prisma.parent.update({
        where: { id: data.id },
        data: {
          ...common,
          ...(data.password ? { password: await hash(data.password) } : {}),
        },
      });
    } else {
      if (!data.password) return failure("Password is required for a new parent.");
      await prisma.parent.create({
        data: { ...common, id: crypto.randomUUID(), password: await hash(data.password) },
      });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/parents");
  return { success: true, error: null };
};

export const deleteParent = async (id: string): Promise<ActionState> => {
  await requirePermission("parents.manage");
  try {
    await prisma.parent.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/parents");
  return { success: true, error: null };
};

// EXAM -------------------------------------------------------------------

/**
 * Verifies a ClassSubject exists and, for teachers, that they are the one
 * teaching it. Exams, assignments, results and attendance all hang off a
 * ClassSubject, so this is the shared ownership check for the workflow.
 */
const assertClassSubjectAccess = async (
  classSubjectId: number,
  userId: string,
  role: string
): Promise<ActionState | null> => {
  if (role !== "teacher") return null;
  const classSubject = await prisma.classSubject.findUnique({
    where: { id: classSubjectId },
    select: { teacherId: true },
  });
  if (!classSubject) return failure("The selected class subject no longer exists.");
  if (classSubject.teacherId !== userId)
    return failure("You can only manage data for subjects you teach.");
  return null;
};

export const saveExam = async (
  _prev: ActionState,
  payload: ExamSchema
): Promise<ActionState> => {
  // Teachers can create/update their own exams; admins can do anything.
  const { userId, role } = await requirePermission("exams.manage");

  const parsed = examSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const accessError = await assertClassSubjectAccess(data.classSubjectId, userId, role);
    if (accessError) return accessError;

    const values = {
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      classSubjectId: data.classSubjectId,
    };

    if (data.id) {
      // On update, a teacher may only edit their own exams.
      if (role === "teacher") {
        const existing = await prisma.exam.findUnique({
          where: { id: data.id },
          include: { classSubject: { select: { teacherId: true } } },
        });
        if (existing?.classSubject.teacherId !== userId)
          return failure("You can only edit your own exams.");
      }
      await prisma.exam.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.exam.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/exams");
  return { success: true, error: null };
};

export const deleteExam = async (id: number): Promise<ActionState> => {
  const { userId, role } = await requirePermission("exams.manage");
  try {
    if (role === "teacher") {
      const existing = await prisma.exam.findUnique({
        where: { id },
        include: { classSubject: { select: { teacherId: true } } },
      });
      if (existing?.classSubject.teacherId !== userId)
        return failure("You can only delete your own exams.");
    }
    await prisma.exam.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/exams");
  return { success: true, error: null };
};

// ASSIGNMENT ------------------------------------------------------------

export const saveAssignment = async (
  _prev: ActionState,
  payload: AssignmentSchema
): Promise<ActionState> => {
  // Teachers can create/update their own assignments; admins can do anything.
  const { userId, role } = await requirePermission("assignments.manage");

  const parsed = assignmentSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const accessError = await assertClassSubjectAccess(data.classSubjectId, userId, role);
    if (accessError) return accessError;

    const values = {
      title: data.title,
      startDate: data.startDate,
      dueDate: data.dueDate,
      classSubjectId: data.classSubjectId,
    };

    if (data.id) {
      // On update, a teacher may only edit their own assignments.
      if (role === "teacher") {
        const existing = await prisma.assignment.findUnique({
          where: { id: data.id },
          include: { classSubject: { select: { teacherId: true } } },
        });
        if (existing?.classSubject.teacherId !== userId)
          return failure("You can only edit your own assignments.");
      }
      await prisma.assignment.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.assignment.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/assignments");
  return { success: true, error: null };
};

export const deleteAssignment = async (id: number): Promise<ActionState> => {
  const { userId, role } = await requirePermission("assignments.manage");
  try {
    if (role === "teacher") {
      const existing = await prisma.assignment.findUnique({
        where: { id },
        include: { classSubject: { select: { teacherId: true } } },
      });
      if (existing?.classSubject.teacherId !== userId)
        return failure("You can only delete your own assignments.");
    }
    await prisma.assignment.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/assignments");
  return { success: true, error: null };
};

// RESULT -----------------------------------------------------------------

/** Resolves a result's exam/assignment and its owning teacher, if present. */
const getResultAssessment = async (data: { examId?: number; assignmentId?: number }) => {
  if (data.examId) {
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
      select: { classSubject: { select: { teacherId: true, classId: true } } },
    });
    return exam?.classSubject ?? null;
  }
  if (data.assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId },
      select: { classSubject: { select: { teacherId: true, classId: true } } },
    });
    return assignment?.classSubject ?? null;
  }
  return null;
};

export const saveResult = async (
  _prev: ActionState,
  payload: ResultSchema
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("results.manage");

  const parsed = resultSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const assessment = await getResultAssessment(data);
    if (!assessment) return failure("The selected assessment no longer exists.");
    if (role === "teacher" && assessment.teacherId !== userId)
      return failure("You can only record scores for subjects you teach.");

    // The student must be enrolled in the assessment's class.
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { classId: true },
    });
    if (!student) return failure("The selected student no longer exists.");
    if (student.classId !== assessment.classId)
      return failure("That student is not enrolled in this assessment's class.");

    const values = {
      score: data.score,
      studentId: data.studentId,
      ...(data.examId ? { examId: data.examId } : {}),
      ...(data.assignmentId ? { assignmentId: data.assignmentId } : {}),
    };

    if (data.id) {
      if (role === "teacher") {
        const existing = await prisma.result.findUnique({
          where: { id: data.id },
          include: {
            exam: { select: { classSubject: { select: { teacherId: true } } } },
            assignment: { select: { classSubject: { select: { teacherId: true } } } },
          },
        });
        const owner =
          existing?.exam?.classSubject.teacherId ??
          existing?.assignment?.classSubject.teacherId;
        if (owner !== userId) return failure("You can only edit your own results.");
      }
      await prisma.result.update({ where: { id: data.id }, data: values });
    } else {
      // Recording a mark for a student who already has one on the same
      // assessment updates the existing score instead of duplicating it.
      const duplicate = await prisma.result.findFirst({
        where: data.examId
          ? { examId: data.examId, studentId: data.studentId }
          : { assignmentId: data.assignmentId!, studentId: data.studentId },
        select: { id: true },
      });
      if (duplicate) {
        await prisma.result.update({
          where: { id: duplicate.id },
          data: { score: data.score },
        });
      } else {
        await prisma.result.create({ data: values });
      }
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/results");
  return { success: true, error: null };
};

export const deleteResult = async (id: number): Promise<ActionState> => {
  const { userId, role } = await requirePermission("results.manage");
  try {
    if (role === "teacher") {
      const existing = await prisma.result.findUnique({
        where: { id },
        include: {
          exam: { select: { classSubject: { select: { teacherId: true } } } },
          assignment: { select: { classSubject: { select: { teacherId: true } } } },
        },
      });
      const owner =
        existing?.exam?.classSubject.teacherId ??
        existing?.assignment?.classSubject.teacherId;
      if (owner !== userId) return failure("You can only delete your own results.");
    }
    await prisma.result.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/results");
  return { success: true, error: null };
};

// ATTENDANCE ------------------------------------------------------------

/** Normalizes a date to midnight for same-day duplicate checks. */
const startOfDay = (value: Date) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (value: Date) => {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Parses a `YYYY-MM-DD` string as *local* midnight. `new Date("YYYY-MM-DD")`
 * is treated as UTC midnight, which can roll to the previous day in negative
 * offset timezones and silently record attendance on the wrong date.
 */
const parseDateOnly = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Rebuilds a local-midnight date from the calendar parts of a Date that was
 * produced by coercing a `YYYY-MM-DD` string (i.e. a UTC-midnight Date).
 */
const toLocalDateOnly = (value: Date): Date =>
  new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

/** Loads a ClassSubject; null when it doesn't exist. */
const getClassSubject = async (classSubjectId: number) =>
  prisma.classSubject.findUnique({
    where: { id: classSubjectId },
    select: { teacherId: true, classId: true },
  });

export const saveAttendance = async (
  _prev: ActionState,
  payload: AttendanceSchema
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("attendance.manage");

  const parsed = attendanceSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    // Attendance is per subject, and a teacher may only record it for the
    // subjects they teach.
    const classSubject = await getClassSubject(data.classSubjectId);
    if (!classSubject) return failure("The selected class subject no longer exists.");
    if (role === "teacher" && classSubject.teacherId !== userId)
      return failure("You can only mark attendance for subjects you teach.");

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { classId: true },
    });
    if (!student) return failure("The selected student no longer exists.");
    if (student.classId !== classSubject.classId)
      return failure("That student is not in this class.");

    const parsedDate = toLocalDateOnly(data.date);
    const dayStart = startOfDay(parsedDate);
    const dayEnd = endOfDay(parsedDate);

    const duplicate = await prisma.attendance.findFirst({
      where: {
        classSubjectId: data.classSubjectId,
        studentId: data.studentId,
        date: { gte: dayStart, lte: dayEnd },
        ...(data.id ? { NOT: { id: data.id } } : {}),
      },
    });
    if (duplicate) {
      return failure("Attendance for this student, subject and date already exists.");
    }

    const values = {
      date: dayStart,
      present: data.present,
      classSubjectId: data.classSubjectId,
      studentId: data.studentId,
    };

    if (data.id) {
      if (role === "teacher") {
        const existing = await prisma.attendance.findUnique({
          where: { id: data.id },
          include: { classSubject: { select: { teacherId: true } } },
        });
        if (existing?.classSubject.teacherId !== userId) {
          return failure("You can only edit attendance for subjects you teach.");
        }
      }
      await prisma.attendance.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.attendance.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/attendance");
  revalidatePath("/admin");
  return { success: true, error: null };
};

export const deleteAttendance = async (id: number): Promise<ActionState> => {
  const { userId, role } = await requirePermission("attendance.manage");
  try {
    if (role === "teacher") {
      const existing = await prisma.attendance.findUnique({
        where: { id },
        include: { classSubject: { select: { teacherId: true } } },
      });
      if (existing?.classSubject.teacherId !== userId) {
        return failure("You can only delete attendance for subjects you teach.");
      }
    }
    await prisma.attendance.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/attendance");
  revalidatePath("/admin");
  return { success: true, error: null };
};

// BULK ATTENDANCE --------------------------------------------------------

/**
 * Loads the roster of a ClassSubject's class together with each student's
 * existing attendance status for the given date, so the attendance sheet can
 * pre-fill. `present` is `null` when no attendance has been recorded for
 * that class subject and date yet.
 */
export const getAttendanceRoster = async (
  classSubjectId: number,
  date: string
): Promise<
  | { students: { studentId: string; name: string; surname: string; present: boolean | null }[] }
  | ActionState
> => {
  const { userId, role } = await requirePermission("attendance.manage");

  const parsedDate = parseDateOnly(date);
  if (Number.isNaN(parsedDate.getTime())) return failure("Please pick a valid date.");

  const classSubject = await getClassSubject(classSubjectId);
  if (!classSubject) return failure("The selected class subject no longer exists.");
  if (role === "teacher" && classSubject.teacherId !== userId) {
    return failure("You can only take attendance for subjects you teach.");
  }

  const [students, existing] = await Promise.all([
    prisma.student.findMany({
      where: { classId: classSubject.classId },
      select: { id: true, name: true, surname: true },
      orderBy: [{ surname: "asc" }, { name: "asc" }],
    }),
    prisma.attendance.findMany({
      where: {
        classSubjectId,
        date: { gte: startOfDay(parsedDate), lte: endOfDay(parsedDate) },
      },
      select: { studentId: true, present: true },
    }),
  ]);

  const statusByStudent = new Map(existing.map((row) => [row.studentId, row.present]));

  return {
    students: students.map((student) => ({
      studentId: student.id,
      name: student.name,
      surname: student.surname,
      present: statusByStudent.get(student.id) ?? null,
    })),
  };
};

/**
 * Records attendance for the whole roster of a ClassSubject's class at once.
 * Existing records for the same student/class subject/date are updated in
 * place, so a sheet can be re-saved without tripping the duplicate check.
 */
export const saveBulkAttendance = async (
  _prev: ActionState,
  payload: {
    classSubjectId: number;
    date: string;
    records: { studentId: string; present: boolean }[];
  }
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("attendance.manage");

  const date = parseDateOnly(payload.date);
  if (Number.isNaN(date.getTime())) return failure("Please pick a valid date.");
  if (!Array.isArray(payload.records) || payload.records.length === 0) {
    return failure("There are no students to mark.");
  }

  try {
    const classSubject = await getClassSubject(payload.classSubjectId);
    if (!classSubject) return failure("The selected class subject no longer exists.");
    if (role === "teacher" && classSubject.teacherId !== userId) {
      return failure("You can only take attendance for subjects you teach.");
    }

    const roster = await prisma.student.findMany({
      where: { classId: classSubject.classId },
      select: { id: true },
    });
    const rosterIds = new Set(roster.map((student) => student.id));
    for (const record of payload.records) {
      if (!rosterIds.has(record.studentId)) {
        return failure("One of the selected students is not enrolled in this class.");
      }
    }

    const dayStart = startOfDay(date);
    const existing = await prisma.attendance.findMany({
      where: {
        classSubjectId: payload.classSubjectId,
        date: { gte: dayStart, lte: endOfDay(date) },
      },
      select: { id: true, studentId: true },
    });
    const idByStudent = new Map(existing.map((row) => [row.studentId, row.id]));

    for (const record of payload.records) {
      const id = idByStudent.get(record.studentId);
      if (id) {
        await prisma.attendance.update({ where: { id }, data: { present: record.present } });
      } else {
        await prisma.attendance.create({
          data: {
            date: dayStart,
            present: record.present,
            classSubjectId: payload.classSubjectId,
            studentId: record.studentId,
          },
        });
      }
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/attendance");
  revalidatePath("/list/attendance/take");
  revalidatePath("/admin");
  return { success: true, error: null };
};

// PERIOD -----------------------------------------------------------------

export const savePeriod = async (
  _prev: ActionState,
  payload: PeriodSchema
): Promise<ActionState> => {
  await requirePermission("periods.manage");

  const parsed = periodSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      order: data.order,
    };
    if (data.id) {
      await prisma.period.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.period.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/timetable");
  return { success: true, error: null };
};

export const deletePeriod = async (id: number): Promise<ActionState> => {
  await requirePermission("periods.manage");
  try {
    await prisma.period.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/timetable");
  return { success: true, error: null };
};

// TIMETABLE ---------------------------------------------------------------

/** A teacher may only touch timetables for classes they supervise or teach. */
const assertClassScope = async (
  classId: number,
  userId: string,
  role: string
): Promise<ActionState | null> => {
  if (role !== "teacher") return null;
  const { classIds } = await getRoleScope();
  if (!classIds?.includes(classId)) {
    return failure("You can only manage timetables for your own classes.");
  }
  return null;
};

export const saveTimetableSlot = async (
  _prev: ActionState,
  payload: TimetableSlotSchema
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("timetable.manage");

  const parsed = timetableSlotSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const scopeError = await assertClassScope(data.classId, userId, role);
    if (scopeError) return scopeError;

    const [classRow, periodRow] = await Promise.all([
      prisma.class.findUnique({ where: { id: data.classId }, select: { id: true } }),
      prisma.period.findUnique({ where: { id: data.periodId }, select: { id: true } }),
    ]);
    if (!classRow) return failure("The selected class no longer exists.");
    if (!periodRow) return failure("The selected period no longer exists.");

    const classSubjectId = data.classSubjectId ?? null;
    if (classSubjectId) {
      const accessError = await assertClassSubjectAccess(classSubjectId, userId, role);
      if (accessError) return accessError;
    }

    // Upsert on the (class, day, period) cell so re-saving the grid never
    // trips the unique constraint.
    await prisma.timetableSlot.upsert({
      where: {
        classId_dayOfWeek_periodId: {
          classId: data.classId,
          dayOfWeek: data.dayOfWeek,
          periodId: data.periodId,
        },
      },
      update: { classSubjectId },
      create: {
        classId: data.classId,
        dayOfWeek: data.dayOfWeek,
        periodId: data.periodId,
        classSubjectId,
      },
    });
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/timetable");
  return { success: true, error: null };
};

export const deleteTimetableSlot = async (id: number): Promise<ActionState> => {
  const { userId, role } = await requirePermission("timetable.manage");
  try {
    const slot = await prisma.timetableSlot.findUnique({
      where: { id },
      select: { classId: true },
    });
    if (!slot) return failure("Timetable slot not found.");

    const scopeError = await assertClassScope(slot.classId, userId, role);
    if (scopeError) return scopeError;

    await prisma.timetableSlot.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/timetable");
  return { success: true, error: null };
};

export const copyTimetable = async (
  _prev: ActionState,
  payload: { fromClassId: number; toClassId: number }
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("timetable.manage");
  try {
    if (payload.fromClassId === payload.toClassId) {
      return failure("Source and target classes are the same.");
    }
    const scopeError = await assertClassScope(payload.toClassId, userId, role);
    if (scopeError) return scopeError;
    // A teacher can only copy from a class they can see (their own scope).
    const sourceScopeError = await assertClassScope(payload.fromClassId, userId, role);
    if (sourceScopeError) return sourceScopeError;

    const slots = await prisma.timetableSlot.findMany({
      where: { classId: payload.fromClassId },
      select: { dayOfWeek: true, periodId: true, classSubjectId: true },
    });
    if (slots.length === 0) {
      return failure("The source class has no timetable to copy.");
    }

    for (const slot of slots) {
      await prisma.timetableSlot.upsert({
        where: {
          classId_dayOfWeek_periodId: {
            classId: payload.toClassId,
            dayOfWeek: slot.dayOfWeek,
            periodId: slot.periodId,
          },
        },
        update: { classSubjectId: slot.classSubjectId },
        create: {
          classId: payload.toClassId,
          dayOfWeek: slot.dayOfWeek,
          periodId: slot.periodId,
          classSubjectId: slot.classSubjectId,
        },
      });
    }
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/timetable");
  return { success: true, error: null };
};

// LESSON ------------------------------------------------------------------

export const saveLesson = async (
  _prev: ActionState,
  payload: LessonSchema
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("lessons.manage");

  const parsed = lessonSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const accessError = await assertClassSubjectAccess(data.classSubjectId, userId, role);
    if (accessError) return accessError;

    const values = {
      title: data.title,
      topic: data.topic || null,
      objectives: data.objectives || null,
      materials: data.materials || null,
      notes: data.notes || null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      classSubjectId: data.classSubjectId,
    };

    if (data.id) {
      if (role === "teacher") {
        const existing = await prisma.lesson.findUnique({
          where: { id: data.id },
          include: { classSubject: { select: { teacherId: true } } },
        });
        if (existing?.classSubject.teacherId !== userId)
          return failure("You can only edit your own lessons.");
      }
      await prisma.lesson.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.lesson.create({
        data: { ...values, teacherId: role === "teacher" ? userId : null },
      });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/lessons");
  return { success: true, error: null };
};

export const deleteLesson = async (id: number): Promise<ActionState> => {
  const { userId, role } = await requirePermission("lessons.manage");
  try {
    if (role === "teacher") {
      const existing = await prisma.lesson.findUnique({
        where: { id },
        include: { classSubject: { select: { teacherId: true } } },
      });
      if (existing?.classSubject.teacherId !== userId)
        return failure("You can only delete your own lessons.");
    }
    await prisma.lesson.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/lessons");
  return { success: true, error: null };
};

// TEACHING LOGBOOK --------------------------------------------------------

export const saveLogbookEntry = async (
  _prev: ActionState,
  payload: LogbookEntrySchema
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("logbook.manage");

  const parsed = logbookEntrySchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const accessError = await assertClassSubjectAccess(data.classSubjectId, userId, role);
    if (accessError) return accessError;

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: data.classSubjectId },
      select: { teacherId: true },
    });
    if (!classSubject) return failure("The selected class subject no longer exists.");

    // A teacher signs their own entry; an admin posting on a class subject's
    // behalf attributes it to that subject's teacher.
    const teacherId = role === "teacher" ? userId : classSubject.teacherId;

    const values = {
      date: startOfDay(data.date),
      topic: data.topic,
      summary: data.summary,
      homework: data.homework || null,
      notes: data.notes || null,
      classSubjectId: data.classSubjectId,
      teacherId,
    };

    if (data.id) {
      if (role === "teacher") {
        const existing = await prisma.logbookEntry.findUnique({
          where: { id: data.id },
          include: { classSubject: { select: { teacherId: true } } },
        });
        if (existing?.classSubject.teacherId !== userId)
          return failure("You can only edit your own logbook entries.");
      }
      await prisma.logbookEntry.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.logbookEntry.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/logbook");
  return { success: true, error: null };
};

export const deleteLogbookEntry = async (id: number): Promise<ActionState> => {
  const { userId, role } = await requirePermission("logbook.manage");
  try {
    if (role === "teacher") {
      const existing = await prisma.logbookEntry.findUnique({
        where: { id },
        include: { classSubject: { select: { teacherId: true } } },
      });
      if (existing?.classSubject.teacherId !== userId)
        return failure("You can only delete your own logbook entries.");
    }
    await prisma.logbookEntry.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/logbook");
  return { success: true, error: null };
};

// BULK RESULTS -------------------------------------------------------------

export const saveBulkResults = async (
  _prev: ActionState,
  payload: {
    examId?: number;
    assignmentId?: number;
    marks: { studentId: string; score: number }[];
  }
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("results.manage");

  const hasExam = Boolean(payload.examId);
  if (hasExam === Boolean(payload.assignmentId)) {
    return failure("Pick exactly one exam or assignment to grade.");
  }
  if (!Array.isArray(payload.marks) || payload.marks.length === 0) {
    return failure("Enter at least one mark.");
  }

  try {
    const assessment = await getResultAssessment(payload);
    if (!assessment) return failure("The selected assessment no longer exists.");
    if (role === "teacher" && assessment.teacherId !== userId)
      return failure("You can only record scores for subjects you teach.");

    const roster = await prisma.student.findMany({
      where: { classId: assessment.classId },
      select: { id: true },
    });
    const rosterIds = new Set(roster.map((student) => student.id));

    for (const mark of payload.marks) {
      if (!rosterIds.has(mark.studentId)) {
        return failure("One of the students is not enrolled in this assessment's class.");
      }
      if (!Number.isInteger(mark.score) || mark.score < 0 || mark.score > 100) {
        return failure("Scores must be whole numbers between 0 and 100.");
      }
    }

    for (const mark of payload.marks) {
      const existing = await prisma.result.findFirst({
        where: {
          studentId: mark.studentId,
          ...(hasExam ? { examId: payload.examId } : { assignmentId: payload.assignmentId }),
        },
        select: { id: true },
      });
      if (existing) {
        await prisma.result.update({ where: { id: existing.id }, data: { score: mark.score } });
      } else {
        await prisma.result.create({
          data: {
            score: mark.score,
            studentId: mark.studentId,
            ...(hasExam ? { examId: payload.examId } : { assignmentId: payload.assignmentId }),
          },
        });
      }
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/results");
  return { success: true, error: null };
};

// GUARDIAN ----------------------------------------------------------------

export const saveGuardian = async (
  _prev: ActionState,
  payload: GuardianSchema
): Promise<ActionState> => {
  await requirePermission("guardians.manage");

  const parsed = guardianSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true },
    });
    if (!student) return failure("The selected student no longer exists.");

    const values = {
      name: data.name,
      relationship: data.relationship,
      phone: data.phone || null,
      email: data.email || null,
      isPrimary: data.isPrimary ?? false,
      studentId: data.studentId,
    };

    if (data.isPrimary) {
      // Only one primary guardian per student.
      await prisma.guardian.updateMany({
        where: { studentId: data.studentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    if (data.id) {
      await prisma.guardian.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.guardian.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/guardians");
  return { success: true, error: null };
};

export const deleteGuardian = async (id: number): Promise<ActionState> => {
  await requirePermission("guardians.manage");
  try {
    await prisma.guardian.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/guardians");
  return { success: true, error: null };
};

// STAFF -------------------------------------------------------------------

export const saveStaff = async (
  _prev: ActionState,
  payload: StaffSchema
): Promise<ActionState> => {
  await requirePermission("staff.manage");

  const parsed = staffSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      name: data.name,
      surname: data.surname,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address,
      role: data.role,
      department: data.department,
      joinDate: startOfDay(data.joinDate),
      birthday: data.birthday ? startOfDay(data.birthday) : null,
      sex: data.sex ?? null,
      img: nullIfBlank(data.img),
    };
    const existing = await prisma.staff.findUnique({
      where: { id: data.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.staff.update({ where: { id: data.id }, data: values });
      await logAudit("Staff", data.id, "update", data.name);
    } else {
      await prisma.staff.create({ data: { id: data.id, ...values } });
      await logAudit("Staff", data.id, "create", data.name);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/staff");
  return { success: true, error: null };
};

export const deleteStaff = async (id: string): Promise<ActionState> => {
  await requirePermission("staff.manage");
  try {
    await prisma.staff.delete({ where: { id } });
    await logAudit("Staff", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/staff");
  return { success: true, error: null };
};

export const saveStaffAttendance = async (
  _prev: ActionState,
  payload: StaffAttendanceSchema
): Promise<ActionState> => {
  await requirePermission("staff.attendance.manage");

  const parsed = staffAttendanceSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    // Upsert on the (staff, date) pair so marking the same day twice just
    // updates the record.
    await prisma.staffAttendance.upsert({
      where: {
        staffId_date: {
          staffId: data.staffId,
          date: startOfDay(data.date),
        },
      },
      update: { present: data.present ?? false, status: data.status },
      create: {
        staffId: data.staffId,
        date: startOfDay(data.date),
        present: data.present ?? false,
        status: data.status,
      },
    });
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/staff/attendance");
  return { success: true, error: null };
};

export const deleteStaffAttendance = async (id: number): Promise<ActionState> => {
  await requirePermission("staff.attendance.manage");
  try {
    await prisma.staffAttendance.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/staff/attendance");
  return { success: true, error: null };
};

export const saveStaffPerformance = async (
  _prev: ActionState,
  payload: StaffPerformanceSchema
): Promise<ActionState> => {
  await requirePermission("staff.performance.manage");

  const parsed = staffPerformanceSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: { id: true },
    });
    if (!staff) return failure("The selected staff member no longer exists.");

    const values = {
      staffId: data.staffId,
      reviewDate: startOfDay(data.reviewDate),
      rating: data.rating,
      comments: data.comments || null,
    };
    if (data.id) {
      await prisma.staffPerformance.update({ where: { id: data.id }, data: values });
    } else {
      await prisma.staffPerformance.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/staff/performance");
  return { success: true, error: null };
};

export const deleteStaffPerformance = async (id: number): Promise<ActionState> => {
  await requirePermission("staff.performance.manage");
  try {
    await prisma.staffPerformance.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/staff/performance");
  return { success: true, error: null };
};

export const saveBulkStaffAttendance = async (
  _prev: ActionState,
  payload: { date: Date; records: { staffId: string; status: string }[] }
): Promise<ActionState> => {
  await requirePermission("staff.attendance.manage");

  if (!Array.isArray(payload.records) || payload.records.length === 0) {
    return failure("Enter attendance for at least one staff member.");
  }

  try {
    const day = startOfDay(payload.date);
    await prisma.$transaction(
      payload.records.map((record) => {
        const status =
          record.status === "Present"
            ? "Present"
            : record.status === "Leave"
              ? "Leave"
              : "Absent";
        return prisma.staffAttendance.upsert({
          where: { staffId_date: { staffId: record.staffId, date: day } },
          update: { present: status === "Present", status },
          create: {
            staffId: record.staffId,
            date: day,
            present: status === "Present",
            status,
          },
        });
      })
    );
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/staff/attendance");
  return { success: true, error: null };
};

// FINANCE -------------------------------------------------------------------

// Recompute an invoice's status from the total of its payments.
async function recomputeInvoiceStatus(invoiceId: number) {
  const [invoice, aggregate] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId }, select: { amount: true } }),
    prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    }),
  ]);
  if (!invoice) return;
  const paid = Number(aggregate._sum.amount ?? 0);
  const status = paid <= 0 ? "Unpaid" : paid >= Number(invoice.amount) ? "Paid" : "Partial";
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export const saveFeeItem = async (
  _prev: ActionState,
  payload: FeeItemSchema
): Promise<ActionState> => {
  await requirePermission("fees.manage");

  const parsed = feeItemSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      name: data.name,
      amount: data.amount,
      classId: data.classId ?? null,
    };
    if (data.id) {
      await prisma.feeItem.update({ where: { id: data.id }, data: values });
      await logAudit("FeeItem", data.id, "update", data.name);
    } else {
      await prisma.feeItem.create({ data: values });
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/fees");
  return { success: true, error: null };
};

export const deleteFeeItem = async (id: number): Promise<ActionState> => {
  await requirePermission("fees.manage");
  try {
    await prisma.feeItem.delete({ where: { id } });
    await logAudit("FeeItem", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/fees");
  return { success: true, error: null };
};

export const saveInvoice = async (
  _prev: ActionState,
  payload: InvoiceSchema
): Promise<ActionState> => {
  await requirePermission("invoices.manage");

  const parsed = invoiceSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true },
    });
    if (!student) return failure("The selected student no longer exists.");

    const values = {
      invoiceNo: data.invoiceNo,
      studentId: data.studentId,
      feeItemId: data.feeItemId,
      amount: data.amount,
      dueDate: startOfDay(data.dueDate),
    };
    if (data.id) {
      await prisma.invoice.update({ where: { id: data.id }, data: values });
      await logAudit("Invoice", data.id, "update", data.invoiceNo);
    } else {
      const created = await prisma.invoice.create({ data: { ...values, status: "Unpaid" } });
      await logAudit("Invoice", created.id, "create", data.invoiceNo);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/invoices");
  return { success: true, error: null };
};

export const deleteInvoice = async (id: number): Promise<ActionState> => {
  await requirePermission("invoices.manage");
  try {
    await prisma.invoice.delete({ where: { id } });
    await logAudit("Invoice", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/invoices");
  return { success: true, error: null };
};

export const savePayment = async (
  _prev: ActionState,
  payload: PaymentSchema
): Promise<ActionState> => {
  await requirePermission("payments.manage");

  const parsed = paymentSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    if (data.id) {
      await prisma.payment.update({
        where: { id: data.id },
        data: {
          amount: data.amount,
          method: data.method,
          date: data.date,
          reference: data.reference || null,
        },
      });
      await recomputeInvoiceStatus(data.invoiceId);
    } else {
      const created = await prisma.payment.create({
        data: {
          invoiceId: data.invoiceId,
          amount: data.amount,
          method: data.method,
          date: data.date,
          reference: data.reference || null,
        },
      });
      await recomputeInvoiceStatus(created.invoiceId);
      await logAudit("Payment", created.id, "create");
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/payments");
  revalidatePath("/list/invoices");
  return { success: true, error: null };
};

export const deletePayment = async (id: number): Promise<ActionState> => {
  await requirePermission("payments.manage");
  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { invoiceId: true },
    });
    await prisma.payment.delete({ where: { id } });
    if (payment) await recomputeInvoiceStatus(payment.invoiceId);
    await logAudit("Payment", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/payments");
  revalidatePath("/list/invoices");
  return { success: true, error: null };
};

export const saveSalaryRecord = async (
  _prev: ActionState,
  payload: SalaryRecordSchema
): Promise<ActionState> => {
  await requirePermission("salaries.manage");

  const parsed = salaryRecordSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.recipientType === "Staff" && !data.staffId) {
    return failure("Select a staff member for this salary record.");
  }
  if (data.recipientType === "Teacher" && !data.teacherId) {
    return failure("Select a teacher for this salary record.");
  }

  try {
    const values = {
      recipientType: data.recipientType,
      staffId: data.recipientType === "Staff" ? data.staffId! : null,
      teacherId: data.recipientType === "Teacher" ? data.teacherId! : null,
      month: new Date(data.month.getFullYear(), data.month.getMonth(), 1),
      amount: data.amount,
      paid: data.paid ?? false,
      paidDate: data.paid ? data.paidDate ?? new Date() : null,
      notes: data.notes || null,
    };
    if (data.id) {
      await prisma.salaryRecord.update({ where: { id: data.id }, data: values });
      await logAudit("SalaryRecord", data.id, "update");
    } else {
      const created = await prisma.salaryRecord.create({ data: values });
      await logAudit("SalaryRecord", created.id, "create");
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/salaries");
  return { success: true, error: null };
};

export const deleteSalaryRecord = async (id: number): Promise<ActionState> => {
  await requirePermission("salaries.manage");
  try {
    await prisma.salaryRecord.delete({ where: { id } });
    await logAudit("SalaryRecord", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/salaries");
  return { success: true, error: null };
};

export const saveExpense = async (
  _prev: ActionState,
  payload: ExpenseSchema
): Promise<ActionState> => {
  await requirePermission("expenses.manage");

  const parsed = expenseSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      title: data.title,
      category: data.category,
      amount: data.amount,
      date: startOfDay(data.date),
      notes: data.notes || null,
    };
    if (data.id) {
      await prisma.expense.update({ where: { id: data.id }, data: values });
      await logAudit("Expense", data.id, "update", data.title);
    } else {
      const created = await prisma.expense.create({ data: values });
      await logAudit("Expense", created.id, "create", data.title);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/expenses");
  return { success: true, error: null };
};

export const deleteExpense = async (id: number): Promise<ActionState> => {
  await requirePermission("expenses.manage");
  try {
    await prisma.expense.delete({ where: { id } });
    await logAudit("Expense", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/expenses");
  return { success: true, error: null };
};

// EVENT --------------------------------------------------------------------

export const saveEvent = async (
  _prev: ActionState,
  payload: EventSchema
): Promise<ActionState> => {
  await requirePermission("events.manage");

  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      // Blank means a school-wide event (Event.classId is nullable).
      classId: data.classId || null,
    };
    if (data.id) {
      await prisma.event.update({ where: { id: data.id }, data: values });
      await logAudit("Event", data.id, "update", data.title);
    } else {
      const created = await prisma.event.create({ data: values });
      await logAudit("Event", created.id, "create", data.title);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/events");
  return { success: true, error: null };
};

export const deleteEvent = async (id: number): Promise<ActionState> => {
  await requirePermission("events.manage");
  try {
    await prisma.event.delete({ where: { id } });
    await logAudit("Event", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/events");
  return { success: true, error: null };
};

// ANNOUNCEMENT --------------------------------------------------------------

export const saveAnnouncement = async (
  _prev: ActionState,
  payload: AnnouncementSchema
): Promise<ActionState> => {
  await requirePermission("announcements.manage");

  const parsed = announcementSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = {
      title: data.title,
      description: data.description,
      date: data.date,
      // Blank means a school-wide announcement (Announcement.classId is nullable).
      classId: data.classId || null,
    };
    if (data.id) {
      await prisma.announcement.update({ where: { id: data.id }, data: values });
      await logAudit("Announcement", data.id, "update", data.title);
    } else {
      const created = await prisma.announcement.create({ data: values });
      await logAudit("Announcement", created.id, "create", data.title);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/announcements");
  return { success: true, error: null };
};

export const deleteAnnouncement = async (id: number): Promise<ActionState> => {
  await requirePermission("announcements.manage");
  try {
    await prisma.announcement.delete({ where: { id } });
    await logAudit("Announcement", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/announcements");
  return { success: true, error: null };
};

// COMMUNICATION -------------------------------------------------------------



export const saveNotification = async (
  _prev: ActionState,
  payload: NotificationSchema
): Promise<ActionState> => {
  await requirePermission("notifications.manage");

  const parsed = notificationSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const values = { title: data.title, message: data.message, role: data.role };
    if (data.id) {
      await prisma.notification.update({ where: { id: data.id }, data: values });
      await logAudit("Notification", data.id, "update", data.title);
    } else {
      const created = await prisma.notification.create({ data: values });
      await logAudit("Notification", created.id, "create", data.title);
    }
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/notifications");
  return { success: true, error: null };
};

export const deleteNotification = async (id: number): Promise<ActionState> => {
  await requirePermission("notifications.manage");
  try {
    await prisma.notification.delete({ where: { id } });
    await logAudit("Notification", id, "delete");
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/notifications");
  return { success: true, error: null };
};

export const sendMessage = async (
  _prev: ActionState,
  payload: MessageSchema
): Promise<ActionState> => {
  const { userId, role } = await requirePermission("messages.send");

  const parsed = messageSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const data = parsed.data;

  // A user cannot message themselves, and the recipient must be a real account
  // of the chosen role. Lookups are intentionally unauthenticated reads.
  const recipientExists = await (async () => {
    switch (data.recipientRole) {
      case "admin":
        return !!(await prisma.admin.findUnique({ where: { id: data.recipientId } }));
      case "teacher":
        return !!(await prisma.teacher.findUnique({ where: { id: data.recipientId } }));
      case "student":
        return !!(await prisma.student.findUnique({ where: { id: data.recipientId } }));
      case "parent":
        return !!(await prisma.parent.findUnique({ where: { id: data.recipientId } }));
      default:
        return false;
    }
  })();

  if (!recipientExists) return failure("The selected recipient does not exist.");
  if (data.recipientId === userId && data.recipientRole === role) {
    return failure("You cannot send a message to yourself.");
  }

  try {
    const created = await prisma.message.create({
      data: {
        senderId: userId,
        senderRole: role,
        recipientId: data.recipientId,
        recipientRole: data.recipientRole,
        subject: data.subject,
        body: data.body,
      },
      select: { id: true },
    });
    await logAudit("Message", created.id, "create", data.subject);
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/messages");
  return { success: true, error: null };
};

export const markMessageRead = async (id: number): Promise<ActionState> => {
  const { userId } = await requirePermission("messages.view");

  try {
    // Only the recipient can mark a message as read.
    await prisma.message.updateMany({
      where: { id, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/messages");
  return { success: true, error: null };
};

export const markNotificationRead = async (id: number): Promise<ActionState> => {
  const { userId } = await requirePermission("notifications.view");

  try {
    await prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId: id, userId } },
      update: {},
      create: { notificationId: id, userId },
    });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/notifications");
  return { success: true, error: null };
};

// PERMISSIONS -------------------------------------------------------------

/**
 * Grants or revokes a single permission for a role (the RBAC controller).
 * Only users holding `permissions.manage` may call it.
 */
export const toggleRolePermission = async (
  role: Role,
  permissionKey: PermissionKey,
  granted: boolean
): Promise<ActionState> => {
  await requirePermission("permissions.manage");

  try {
    if (granted) {
      await prisma.rolePermission.upsert({
        where: { role_permissionKey: { role, permissionKey } },
        update: {},
        create: { role, permissionKey },
      });
    } else {
      await prisma.rolePermission
        .delete({ where: { role_permissionKey: { role, permissionKey } } })
        .catch(() => undefined);
    }
    await logAudit(
      "RolePermission",
      `${role}:${permissionKey}`,
      granted ? "create" : "delete"
    );
  } catch (error) {
    return failure(describeError(error));
  }

  revalidatePath("/list/permissions");
  return { success: true, error: null };
};
