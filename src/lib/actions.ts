"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./actionState";
import { requireRole } from "./auth";
import {
  classSchema,
  studentSchema,
  subjectSchema,
  teacherSchema,
  type ClassSchema,
  type StudentSchema,
  type SubjectSchema,
  type TeacherSchema,
} from "./formSchemas";
import prisma from "./prisma";

/** Blank strings must become `null` so Prisma's nullable unique columns don't collide on "". */
const nullIfBlank = (value: string | undefined) =>
  value && value.trim() !== "" ? value.trim() : null;

const hash = (plain: string) => bcrypt.hash(plain, 10);

const failure = (error: string): ActionState => ({ success: false, error });

/** Turns Prisma's unique-constraint error into a message naming the field. */
const describeError = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  if (code === "P2002") {
    const target = (error as { meta?: { target?: unknown } })?.meta?.target;
    const fields = Array.isArray(target) ? target.join(", ") : "field";
    return `That ${fields} is already taken.`;
  }
  // A delete blocked by a foreign key: the row is still referenced elsewhere
  // (e.g. a teacher who still has lessons, or a class with students in it).
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
  await requireRole(["admin"]);

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
  await requireRole(["admin"]);
  try {
    await prisma.teacher.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/teachers");
  return { success: true, error: null };
};

// STUDENT ---------------------------------------------------------------

export const saveStudent = async (
  _prev: ActionState,
  payload: StudentSchema
): Promise<ActionState> => {
  await requireRole(["admin"]);

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
  await requireRole(["admin"]);
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
  await requireRole(["admin"]);

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
  await requireRole(["admin"]);
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
  await requireRole(["admin"]);

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
  await requireRole(["admin"]);
  try {
    await prisma.class.delete({ where: { id } });
  } catch (error) {
    return failure(describeError(error));
  }
  revalidatePath("/list/classes");
  return { success: true, error: null };
};
