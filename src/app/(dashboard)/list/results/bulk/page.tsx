import BulkResultsForm from "@/components/BulkResultsForm";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";

const BulkResultsPage = async () => {
  await requirePermission("results.manage");
  const { role, userId, classIds } = await getRoleScope();
  const canManage = role === "admin" || role === "teacher";

  const scopedWhere =
    role === "teacher" && userId ? { classSubject: { teacherId: userId } } : {};

  const [exams, assignments, students] = await Promise.all([
    canManage
      ? prisma.exam.findMany({
          where: scopedWhere,
          select: {
            id: true,
            title: true,
            classSubject: {
              select: {
                classId: true,
                subject: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
          },
          orderBy: { id: "desc" },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.assignment.findMany({
          where: scopedWhere,
          select: {
            id: true,
            title: true,
            classSubject: {
              select: {
                classId: true,
                subject: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
          },
          orderBy: { id: "desc" },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.student.findMany({
          where: role === "teacher" && classIds ? { classId: { in: classIds } } : {},
          select: {
            id: true,
            name: true,
            surname: true,
            classId: true,
            class: { select: { name: true } },
          },
          orderBy: [{ surname: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const assessments = [
    ...exams.map((exam) => ({
      value: `exam:${exam.id}`,
      label: `${exam.title} (Exam) · ${exam.classSubject.subject.name} · ${exam.classSubject.class.name}`,
      classId: exam.classSubject.classId,
    })),
    ...assignments.map((assignment) => ({
      value: `assignment:${assignment.id}`,
      label: `${assignment.title} (Assignment) · ${assignment.classSubject.subject.name} · ${assignment.classSubject.class.name}`,
      classId: assignment.classSubject.classId,
    })),
  ];

  const studentsData = students.map((student) => ({
    id: student.id,
    label: `${student.name} ${student.surname} · ${student.class.name}`,
    classId: student.classId,
  }));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <h1 className="hidden md:block text-lg font-semibold mb-4">
        Bulk Result Entry
      </h1>
      {canManage ? (
        <BulkResultsForm assessments={assessments} students={studentsData} />
      ) : (
        <p className="text-sm text-gray-500">
          You don&apos;t have permission to record results.
        </p>
      )}
    </div>
  );
};

export default BulkResultsPage;
