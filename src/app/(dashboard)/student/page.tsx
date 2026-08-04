import Announcements from "@/components/Announcements";
import EventCalendar from "@/components/EventCalendar";
import { requireRole } from "@/lib/auth";
import { gradeFromScore } from "@/lib/grades";
import prisma from "@/lib/prisma";
import { resolveSelectedDay } from "@/lib/eventDay";
import { getRoleScope } from "@/lib/roleScope";

const dateFormat = new Intl.DateTimeFormat("en-US");

const StudentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { userId } = await requireRole(["student"]);
  const { classIds } = await getRoleScope();
  const scopedClassIds = classIds ?? [];

  // The calendar writes the picked day to `?date=`, so the events panel below
  // follows whatever day is selected.
  const { date } = await searchParams;
  const { start, end } = resolveSelectedDay(date);

  const [student, upcomingExams, upcomingAssignments, events, announcements, attendance, results, slots] =
    await Promise.all([
      prisma.student.findUnique({
        where: { id: userId },
        select: { class: { select: { name: true } } },
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
      prisma.event.findMany({
        where: {
          startTime: { gte: start, lt: end },
          OR: [{ classId: null }, { classId: { in: scopedClassIds } }],
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.announcement.findMany({
        where: { OR: [{ classId: null }, { classId: { in: scopedClassIds } }] },
        orderBy: { date: "desc" },
        take: 3,
      }),
      prisma.attendance.findMany({
        where: { studentId: userId },
        select: {
          present: true,
          classSubject: {
            select: {
              subject: { select: { name: true } },
            },
          },
        },
      }),
      prisma.result.findMany({
        where: { studentId: userId },
        include: {
          exam: {
            select: {
              title: true,
              startTime: true,
              classSubject: {
                select: { subject: { select: { name: true } } },
              },
            },
          },
          assignment: {
            select: {
              title: true,
              dueDate: true,
              classSubject: {
                select: { subject: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        take: 8,
      }),
      prisma.timetableSlot.findMany({
        where: { classId: { in: scopedClassIds } },
        include: {
          period: { select: { name: true, order: true, startTime: true, endTime: true } },
          classSubject: {
            select: {
              subject: { select: { name: true } },
            },
          },
        },
        orderBy: [{ dayOfWeek: "asc" }, { period: { order: "asc" } }],
      }),
    ]);

  const timeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const eventItems = events.map((event) => ({
    id: event.id,
    title: event.title,
    time: `${timeFormat.format(event.startTime)} - ${timeFormat.format(event.endTime)}`,
    description: event.description,
  }));

  const announcementItems = announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    date: dateFormat.format(announcement.date),
  }));

  const totalAttendance = attendance.length;
  const presentCount = attendance.filter((record) => record.present).length;
  const attendancePct =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

  // Attendance percentage per subject.
  const bySubject = new Map<string, { present: number; total: number }>();
  for (const record of attendance) {
    const key = record.classSubject.subject.name;
    const entry = bySubject.get(key) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (record.present) entry.present += 1;
    bySubject.set(key, entry);
  }

  const subjectAttendance = Array.from(bySubject.entries()).map(
    ([subject, value]) => ({
      subject,
      pct: value.total > 0 ? Math.round((value.present / value.total) * 100) : 0,
    })
  );

  const resultItems = results.flatMap((result) => {
    const source = result.exam ?? result.assignment;
    if (!source) return [];
    return [
      {
        id: result.id,
        title: source.title,
        subject: source.classSubject.subject.name,
        score: result.score,
        grade: gradeFromScore(result.score),
      },
    ];
  });

  const timeOf = (value: Date) => timeFormat.format(value);
  const slotsByDay = new Map<number, typeof slots>();
  for (const slot of slots) {
    const list = slotsByDay.get(slot.dayOfWeek) ?? [];
    list.push(slot);
    slotsByDay.set(slot.dayOfWeek, list);
  }
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ATTENDANCE SUMMARY */}
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-lg font-semibold">Attendance</h1>
            <p className="mt-2 text-3xl font-bold text-kamal-sky">
              {attendancePct === null ? "—" : `${attendancePct}%`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {presentCount}/{totalAttendance} sessions attended
            </p>
            <div className="flex flex-col gap-1 mt-3">
              {subjectAttendance.slice(0, 4).map((row) => (
                <div key={row.subject} className="flex justify-between text-xs">
                  <span className="text-gray-500">{row.subject}</span>
                  <span className="font-medium">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          {/* RECENT GRADES */}
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-lg font-semibold">Recent Results</h1>
            <div className="flex flex-col gap-2 mt-2">
              {resultItems.length === 0 && (
                <p className="text-sm text-gray-400">No results yet.</p>
              )}
              {resultItems.slice(0, 5).map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="text-gray-800">{result.title}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {result.subject}
                    </span>
                  </div>
                  <span className="font-semibold text-kamal-sky">
                    {result.score} ({result.grade})
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* TIMETABLE */}
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-lg font-semibold">This Week</h1>
            <div className="flex flex-col gap-2 mt-2">
              {dayNames.map((day, index) => {
                const daySlots = slotsByDay.get(index + 1) ?? [];
                const firstSlot = daySlots[0];
                return (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="text-gray-500">{day}</span>
                    <span className="font-medium text-right">
                      {firstSlot?.classSubject
                        ? `${firstSlot.classSubject.subject.name} (${timeOf(firstSlot.period.startTime)})`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-md">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              Upcoming Exams
              {student?.class ? ` (${student.class.name})` : ""}
            </h1>
          </div>
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
        <div className="bg-white p-4 rounded-md">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Assignments</h1>
          </div>
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
        <EventCalendar events={eventItems} />
        <Announcements items={announcementItems} />
      </div>
    </div>
  );
};

export default StudentPage;
