import HallTickets from "@/components/HallTickets";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";
import { getSettings } from "@/lib/settings";

const HallTicketsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("halltickets.view");
  const { role, userId, classIds } = await getRoleScope();
  const { classId: classIdParam, examId: examIdParam } = await searchParams;
  const requestedClassId = Number(
    Array.isArray(classIdParam) ? classIdParam[0] : classIdParam
  );
  const requestedExamId = Number(Array.isArray(examIdParam) ? examIdParam[0] : examIdParam);

  const classWhere: Prisma.ClassWhereInput =
    role === "admin" ? {} : { id: { in: classIds ?? [] } };
  const examWhere: Prisma.ExamWhereInput =
    role === "admin"
      ? {}
      : { classSubject: { teacherId: role === "teacher" ? (userId ?? "__none__") : "__none__" } };
  const studentWhere: Prisma.StudentWhereInput =
    role === "admin" ? {} : { classId: { in: classIds ?? [] } };

  const [classes, exams, students] = await Promise.all([
    prisma.class.findMany({
      where: classWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.exam.findMany({
      where: examWhere,
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        surname: true,
        classId: true,
        class: { select: { name: true } },
      },
      orderBy: [{ surname: "asc" }, { name: "asc" }],
    }),
  ]);

  const selectedClassId = Number.isInteger(requestedClassId)
    ? requestedClassId
    : classes[0]?.id;

  const selectedExamId = Number.isInteger(requestedExamId)
    ? requestedExamId
    : undefined;

  const settings = await getSettings();

  return (
    <HallTickets
      classes={classes}
      exams={exams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        subject: exam.classSubject.subject.name,
        className: exam.classSubject.class.name,
        classId: exam.classSubject.class.id,
        startTime: exam.startTime.toISOString(),
        endTime: exam.endTime.toISOString(),
      }))}
      students={students.map((student) => ({
        id: student.id,
        name: student.name,
        surname: student.surname,
        classId: student.classId,
        className: student.class.name,
      }))}
      selectedClassId={selectedClassId}
      selectedExamId={selectedExamId}
      schoolName={settings.schoolName || "Kamal School"}
    />
  );
};

export default HallTicketsPage;
