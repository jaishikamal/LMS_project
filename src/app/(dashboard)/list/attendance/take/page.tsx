import AttendanceSheet from "@/components/forms/AttendanceSheet";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";

const TakeAttendancePage = async () => {
  const { userId, role } = await requirePermission("attendance.manage");

  const classSubjects = await prisma.classSubject.findMany({
    where: role === "teacher" ? { teacherId: userId } : {},
    select: {
      id: true,
      subject: { select: { name: true } },
      class: { select: { name: true } },
      teacher: { select: { name: true, surname: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {classSubjects.length === 0 ? (
        <p className="text-sm text-gray-400">
          You don&apos;t teach any class subjects yet, so there is nothing to
          take attendance for.
        </p>
      ) : (
        <AttendanceSheet
          classSubjects={classSubjects.map((item) => ({
            value: item.id,
            label: `${item.subject.name} · ${item.class.name} · ${item.teacher.name} ${item.teacher.surname}`,
          }))}
        />
      )}
    </div>
  );
};

export default TakeAttendancePage;
