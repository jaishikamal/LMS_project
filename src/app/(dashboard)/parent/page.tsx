import Announcements from "@/components/Announcements";
import { requireRole } from "@/lib/auth";
import { gradeFromScore } from "@/lib/grades";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";

const dateFormat = new Intl.DateTimeFormat("en-US");

const ParentPage = async () => {
  const { userId } = await requireRole(["parent"]);
  const { classIds, studentIds } = await getRoleScope();
  const scopedClassIds = classIds ?? [];
  const scopedStudentIds = studentIds ?? [];

  const [children, upcomingExams, upcomingAssignments, announcements, attendance, results] =
    await Promise.all([
      prisma.student.findMany({
        where: { parentId: userId },
        select: {
          id: true,
          name: true,
          surname: true,
          class: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.exam.findMany({
        where: { classSubject: { classId: { in: scopedClassIds } } },
        select: {
          id: true,
          title: true,
          startTime: true,
          classSubject: {
            select: {
              subject: { select: { name: true } },
              class: { select: { name: true } },
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      }),
      prisma.assignment.findMany({
        where: { classSubject: { classId: { in: scopedClassIds } } },
        select: {
          id: true,
          title: true,
          dueDate: true,
          classSubject: {
            select: {
              subject: { select: { name: true } },
              class: { select: { name: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.announcement.findMany({
        where: { OR: [{ classId: null }, { classId: { in: scopedClassIds } }] },
        orderBy: { date: "desc" },
        take: 3,
      }),
      prisma.attendance.findMany({
        where: { studentId: { in: scopedStudentIds } },
        select: {
          present: true,
          studentId: true,
          classSubject: {
            select: {
              subject: { select: { name: true } },
            },
          },
        },
      }),
      prisma.result.findMany({
        where: { studentId: { in: scopedStudentIds } },
        select: {
          id: true,
          score: true,
          studentId: true,
          exam: {
            select: {
              title: true,
              classSubject: {
                select: { subject: { select: { name: true } } },
              },
            },
          },
          assignment: {
            select: {
              title: true,
              classSubject: {
                select: { subject: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        take: 20,
      }),
    ]);

  const announcementItems = announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    date: dateFormat.format(announcement.date),
  }));

  // Per-child attendance percentage.
  const childAttendance = new Map<string, { present: number; total: number }>();
  for (const record of attendance) {
    const entry = childAttendance.get(record.studentId) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (record.present) entry.present += 1;
    childAttendance.set(record.studentId, entry);
  }

  // Per-child recent results.
  const childResults = new Map<string, { title: string; score: number; grade: string }[]>();
  for (const result of results) {
    const source = result.exam ?? result.assignment;
    if (!source) continue;
    const list = childResults.get(result.studentId) ?? [];
    if (list.length < 5) {
      list.push({
        title: source.title,
        score: result.score,
        grade: gradeFromScore(result.score),
      });
    }
    childResults.set(result.studentId, list);
  }

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        {/* CHILDREN */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            My Children
            {children.length > 0
              ? ` (${children.map((c) => `${c.name} ${c.surname}`).join(", ")})`
              : ""}
          </h1>
          <div className="flex flex-col gap-4 mt-4">
            {children.length === 0 && (
              <p className="text-sm text-gray-400">No children enrolled.</p>
            )}
            {children.map((child) => {
              const stats = childAttendance.get(child.id ?? "");
              return (
                <div
                  key={`${child.name}${child.surname}`}
                  className="flex items-center justify-between gap-2"
                >
                  <div>
                    <h2 className="font-medium text-sm">
                      {child.name} {child.surname}
                    </h2>
                    <p className="text-xs text-gray-400">
                      Attendance:{" "}
                      {stats && stats.total > 0
                        ? `${Math.round((stats.present / stats.total) * 100)}%`
                        : "—"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{child.class.name}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* RECENT GRADES PER CHILD */}
        {children.map((child) => {
          const childId = child.id;
          const resultsList = childResults.get(childId) ?? [];
          return (
            <div key={`${child.name}${child.surname}-grades`} className="bg-white p-4 rounded-md">
              <h1 className="text-xl font-semibold">
                Recent Results · {child.name} {child.surname}
              </h1>
              <div className="flex flex-col gap-2 mt-4">
                {resultsList.length === 0 && (
                  <p className="text-sm text-gray-400">No results yet.</p>
                )}
                {resultsList.map((result, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{result.title}</span>
                    <span className="font-semibold text-kamal-sky">
                      {result.score} ({result.grade})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {/* UPCOMING EXAMS */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Upcoming Exams</h1>
          <div className="flex flex-col gap-4 mt-4">
            {upcomingExams.length === 0 && (
              <p className="text-sm text-gray-400">No upcoming exams.</p>
            )}
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between gap-2"
              >
                <div>
                  <h2 className="font-medium text-sm">{exam.title}</h2>
                  <p className="text-xs text-gray-400">
                    {exam.classSubject.subject.name} ·{" "}
                    {exam.classSubject.class.name}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {dateFormat.format(exam.startTime)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* ASSIGNMENTS */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Assignments</h1>
          <div className="flex flex-col gap-4 mt-4">
            {upcomingAssignments.length === 0 && (
              <p className="text-sm text-gray-400">No assignments yet.</p>
            )}
            {upcomingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-2"
              >
                <div>
                  <h2 className="font-medium text-sm">{assignment.title}</h2>
                  <p className="text-xs text-gray-400">
                    {assignment.classSubject.subject.name} ·{" "}
                    {assignment.classSubject.class.name}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  Due {dateFormat.format(assignment.dueDate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements items={announcementItems} />
      </div>
    </div>
  );
};

export default ParentPage;
