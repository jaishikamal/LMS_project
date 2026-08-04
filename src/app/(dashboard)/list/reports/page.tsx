import ReportCard from "@/components/ReportCard";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";
import { getSettings } from "@/lib/settings";

const classWhere = (role: string, classIds: number[] | null): Prisma.ClassWhereInput =>
  role === "admin" ? {} : { id: { in: classIds ?? [] } };

const studentWhere = (
  role: string,
  classIds: number[] | null,
  studentIds: string[] | null
): Prisma.StudentWhereInput => {
  if (role === "admin") return {};
  if (role === "teacher") return { classId: { in: classIds ?? [] } };
  if (role === "parent") return { id: { in: studentIds ?? [] } };
  return {}; // student is resolved by id below
};

const ReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("reports.view");
  const { role, userId, classIds, studentIds } = await getRoleScope();
  const { classId: classIdParam, studentId: studentIdParam } = await searchParams;

  const isViewer = role === "student" || role === "parent";
  const canSelect = role === "admin" || role === "teacher";

  const [classes, students, scopeStudentIds] = await Promise.all([
    canSelect
      ? prisma.class.findMany({
          where: classWhere(role, classIds),
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [],
    canSelect
      ? prisma.student.findMany({
          where: studentWhere(role, classIds, studentIds),
          select: {
            id: true,
            name: true,
            surname: true,
            classId: true,
            class: { select: { name: true } },
          },
          orderBy: [{ surname: "asc" }, { name: "asc" }],
        })
      : [],
    role === "student" || role === "parent" ? studentIds ?? [] : [],
  ]);

  let selectedStudentId: string | undefined = undefined;
  if (role === "student") {
    selectedStudentId = userId ?? undefined;
  } else if (role === "parent") {
    const paramStudentId =
      typeof studentIdParam === "string" ? studentIdParam : undefined;
    selectedStudentId =
      paramStudentId && scopeStudentIds.includes(paramStudentId)
        ? paramStudentId
        : scopeStudentIds[0];
  } else {
    const paramStudentId =
      typeof studentIdParam === "string" ? studentIdParam : undefined;
    const paramClassId = Number(
      Array.isArray(classIdParam) ? classIdParam[0] : classIdParam
    );
    const matching = students.find((student) => student.id === paramStudentId);
    selectedStudentId = matching?.id ?? students[0]?.id;
    const resolvedClassId = matching?.classId ?? paramClassId;
    void resolvedClassId;
  }

  const [student, classSubjects, results, attendance] = await Promise.all([
    selectedStudentId
      ? prisma.student.findUnique({
          where: { id: selectedStudentId },
          select: {
            name: true,
            surname: true,
            class: { select: { name: true } },
          },
        })
      : Promise.resolve(null),
    selectedStudentId
      ? prisma.student
          .findUnique({
            where: { id: selectedStudentId },
            select: { classId: true },
          })
          .then((row) =>
            row
              ? prisma.classSubject.findMany({
                  where: { classId: row.classId },
                  include: { subject: { select: { name: true } } },
                  orderBy: { subject: { name: "asc" } },
                })
              : []
          )
      : Promise.resolve([]),
    selectedStudentId
      ? prisma.result.findMany({
          where: { studentId: selectedStudentId },
          select: {
            score: true,
            examId: true,
            assignmentId: true,
            exam: { select: { classSubjectId: true } },
            assignment: { select: { classSubjectId: true } },
          },
        })
      : Promise.resolve([]),
    selectedStudentId
      ? prisma.attendance.findMany({
          where: { studentId: selectedStudentId },
          select: { classSubjectId: true, present: true },
        })
      : Promise.resolve([]),
  ]);

  const subjectIdFromResult = (result: (typeof results)[number]) =>
    result.exam?.classSubjectId ?? result.assignment?.classSubjectId;

  const rows = classSubjects.map((cs) => {
    const subjectResults = results.filter(
      (result) => subjectIdFromResult(result) === cs.id
    );
    const average =
      subjectResults.length > 0
        ? Math.round(
            subjectResults.reduce((sum, result) => sum + result.score, 0) /
              subjectResults.length
          )
        : null;
    const subjectAttendance = attendance.filter(
      (record) => record.classSubjectId === cs.id
    );
    const present = subjectAttendance.filter((record) => record.present).length;
    const attendancePct =
      subjectAttendance.length > 0
        ? Math.round((present / subjectAttendance.length) * 100)
        : null;

    return {
      subject: cs.subject.name,
      average,
      attendancePct,
    };
  });

  const scoredRows = rows.filter((row) => row.average !== null);
  const overallAverage =
    scoredRows.length > 0
      ? Math.round(
          scoredRows.reduce((sum, row) => sum + (row.average ?? 0), 0) /
            scoredRows.length
        )
      : null;

  const settings = await getSettings();

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <h1 className="hidden md:block text-lg font-semibold mb-4">
        Report Card
      </h1>
      {isViewer || selectedStudentId ? (
        <ReportCard
          schoolName={settings.schoolName || "Kamal School"}
          studentName={
            student ? `${student.name} ${student.surname}` : "—"
          }
          className={student?.class.name ?? "—"}
          canSelect={canSelect}
          classes={classes}
          students={students.map((item) => ({
            id: item.id,
            name: item.name,
            surname: item.surname,
            classId: item.classId,
            className: item.class.name,
          }))}
          selectedStudentId={selectedStudentId}
          rows={rows}
          overallAverage={overallAverage}
        />
      ) : (
        <p className="text-sm text-gray-500">No students available.</p>
      )}
    </div>
  );
};

export default ReportsPage;
