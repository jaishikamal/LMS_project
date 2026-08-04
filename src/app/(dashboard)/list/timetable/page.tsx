import TimetableGrid from "@/components/TimetableGrid";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";

const TimetablePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("timetable.view");
  const { role, userId, classIds } = await getRoleScope();
  const { classId: classIdParam } = await searchParams;
  const requestedClassId = Number(
    Array.isArray(classIdParam) ? classIdParam[0] : classIdParam
  );

  const classWhere: Prisma.ClassWhereInput =
    role === "admin" ? {} : { id: { in: classIds ?? [] } };
  const classSubjectWhere: Prisma.ClassSubjectWhereInput =
    role === "admin"
      ? {}
      : { teacherId: role === "teacher" ? (userId ?? "__none__") : "__none__" };

  const [periods, classes, classSubjects, slots] = await Promise.all([
    prisma.period.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, startTime: true, endTime: true },
    }),
    prisma.class.findMany({
      where: classWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.classSubject.findMany({
      where: classSubjectWhere,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
    }),
    Promise.resolve([]),
  ]);

  const selectedClassId = Number.isInteger(requestedClassId)
    ? requestedClassId
    : classes[0]?.id;

  const allSlots =
    selectedClassId && role !== "student" && role !== "parent"
      ? await prisma.timetableSlot.findMany({
          where: { classId: selectedClassId },
          include: {
            classSubject: {
              include: { subject: { select: { name: true } } },
            },
          },
        })
      : [];

  const slotsData = allSlots.map((slot) => ({
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    periodId: slot.periodId,
    classSubjectId: slot.classSubjectId,
    classSubjectName: slot.classSubject?.subject.name ?? null,
  }));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="hidden md:block text-lg font-semibold">
          Timetable
        </h1>
        <p className="text-sm text-gray-500">
          Click a cell to schedule or change a subject. Use &quot;Copy from&quot; to
          reuse another class&apos;s timetable.
        </p>
      </div>

      <TimetableGrid
        periods={periods.map((period) => ({
          id: period.id,
          name: period.name,
          startTime: period.startTime.toISOString(),
          endTime: period.endTime.toISOString(),
        }))}
        classes={classes}
        classSubjects={classSubjects.map((item) => ({
          value: item.id,
          label: `${item.class.name} · ${item.subject.name} (${item.teacher.name} ${item.teacher.surname})`,
        }))}
        slots={slotsData}
        selectedClassId={selectedClassId}
        role={role ?? ""}
      />
    </div>
  );
};

export default TimetablePage;
