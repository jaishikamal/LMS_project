import Announcements from "@/components/Announcements";
import AttendanceChart from "@/components/AttendanceChart";
import EventCalendar from "@/components/EventCalendar";
import SubjectPerformanceChart from "@/components/SubjectPerformanceChart";
import UserCard from "@/components/UserCard";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { resolveSelectedDay } from "@/lib/eventDay";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";
import Image from "next/image";
import Link from "next/link";

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("en-US");
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

const getTeacherProfile = async (userId: string) => {
  return prisma.teacher.findUnique({
    where: { id: userId },
    select: {
      name: true,
      surname: true,
      email: true,
      img: true,
      subjects: { select: { name: true }, orderBy: { name: "asc" } },
    },
  });
};

/** The classes this teacher supervises, with their student headcounts. */
const getSupervisedClasses = async (userId: string) => {
  return prisma.class.findMany({
    where: { supervisorId: userId },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });
};

/** Upcoming exams for the class subjects this teacher teaches. */
const getUpcomingExams = async (userId: string) => {
  return prisma.exam.findMany({
    where: { classSubject: { teacherId: userId } },
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
    take: 4,
  });
};

/** Soonest assignments for the class subjects this teacher teaches. */
const getUpcomingAssignments = async (userId: string) => {
  return prisma.assignment.findMany({
    where: { classSubject: { teacherId: userId } },
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
    take: 4,
  });
};

/** Present/absent rows from the last 7 days across the teacher's classes. */
const getAttendanceForLastWeek = async (userId: string) => {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.attendance.findMany({
    where: {
      date: { gte: since },
      classSubject: { teacherId: userId },
    },
    select: { date: true, present: true },
  });

  const byDay = new Map<string, { present: number; absent: number }>();
  for (const row of rows) {
    const label = dayLabels[row.date.getDay() - 1];
    if (!label) continue;
    const entry = byDay.get(label) ?? { present: 0, absent: 0 };
    if (row.present) entry.present += 1;
    else entry.absent += 1;
    byDay.set(label, entry);
  }

  return dayLabels.map((name) => ({
    name,
    present: byDay.get(name)?.present ?? 0,
    absent: byDay.get(name)?.absent ?? 0,
  }));
};

/** Average score per subject taught by this teacher. */
const getSubjectPerformance = async (userId: string) => {
  const results = await prisma.result.findMany({
    where: {
      OR: [{ exam: { classSubject: { teacherId: userId } } }, { assignment: { classSubject: { teacherId: userId } } }],
    },
    select: {
      score: true,
      exam: { select: { classSubject: { select: { subject: { select: { name: true } } } } } },
      assignment: { select: { classSubject: { select: { subject: { select: { name: true } } } } } },
    },
  });

  const totals = new Map<string, { sum: number; count: number }>();
  for (const result of results) {
    const subject = result.exam?.classSubject.subject.name ?? result.assignment?.classSubject.subject.name;
    if (!subject) continue;
    const entry = totals.get(subject) ?? { sum: 0, count: 0 };
    entry.sum += result.score;
    entry.count += 1;
    totals.set(subject, entry);
  }

  return Array.from(totals.entries())
    .map(([subject, value]) => ({
      subject,
      average: value.count > 0 ? Math.round(value.sum / value.count) : 0,
    }))
    .sort((a, b) => b.average - a.average);
};

/** This teacher's timetable slots for a given day of the week. */
const getSlotsForDay = async (userId: string, dayOfWeek: number) => {
  return prisma.timetableSlot.findMany({
    where: { dayOfWeek, classSubject: { teacherId: userId } },
    include: {
      period: { select: { name: true, order: true, startTime: true, endTime: true } },
      classSubject: {
        select: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { period: { order: "asc" } },
  });
};

/** Most recent teaching logbook entries for this teacher. */
const getRecentLogbook = async (userId: string) => {
  return prisma.logbookEntry.findMany({
    where: { teacherId: userId },
    select: {
      id: true,
      date: true,
      topic: true,
      classSubject: {
        select: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: 3,
  });
};

const TeacherPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { userId } = await requireRole(["teacher"]);
  const { name } = await getCurrentUser();
  const { classIds } = await getRoleScope();
  const scopedClassIds = classIds ?? [];

  // The calendar writes the picked day to `?date=`, so the events panel
  // follows whatever day is selected.
  const { date } = await searchParams;
  const { start, end } = resolveSelectedDay(date);

  const today = new Date().getDay();
  const todayDayOfWeek = today >= 1 && today <= 5 ? today : null;

  const [
    profile,
    classCount,
    examCount,
    taughtClassSubjects,
    studentCount,
    events,
    announcements,
    supervisedClasses,
    upcomingExams,
    upcomingAssignments,
    attendanceData,
    subjectPerformance,
    todaySlots,
    recentLogbook,
  ] = await Promise.all([
    getTeacherProfile(userId),
    prisma.class.count({ where: { id: { in: scopedClassIds } } }),
    prisma.exam.count({ where: { classSubject: { teacherId: userId } } }),
    prisma.classSubject.findMany({
      where: { teacherId: userId },
      select: { subjectId: true },
      distinct: ["subjectId"],
    }),
    prisma.student.count({ where: { classId: { in: scopedClassIds } } }),
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
    getSupervisedClasses(userId),
    getUpcomingExams(userId),
    getUpcomingAssignments(userId),
    getAttendanceForLastWeek(userId),
    getSubjectPerformance(userId),
    todayDayOfWeek ? getSlotsForDay(userId, todayDayOfWeek) : Promise.resolve([]),
    getRecentLogbook(userId),
  ]);

  const subjectCount = taughtClassSubjects.length;

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

  const fullName = profile
    ? `${profile.name} ${profile.surname}`
    : name ?? "Teacher";

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col">
      {/* WELCOME BANNER */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome back, {fullName.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here&apos;s what&apos;s happening with your classes today.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {profile?.img ? (
              <Image
                src={profile.img}
                alt=""
                width={40}
                height={40}
                className="rounded-full w-10 h-10 object-cover"
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-kamal-purple-light flex items-center justify-center font-semibold text-kamal-purple">
                {fullName.charAt(0)}
              </span>
            )}
            <div>
              <p className="font-medium text-gray-700">{fullName}</p>
              <p className="text-xs">{dateFormat.format(new Date())}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        {/* LEFT */}
        <div className="w-full xl:w-2/3 flex flex-col gap-4">
          {/* STAT CARDS */}
          <div className="flex gap-4 justify-between flex-wrap">
            <UserCard type="class" count={classCount} />
            <UserCard type="subject" count={subjectCount} />
            <UserCard type="student" count={studentCount} />
            <UserCard type="exam" count={examCount} />
          </div>

          {/* CHARTS */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-h-[260px] lg:w-1/2">
              <AttendanceChart data={attendanceData} />
            </div>
            <div className="flex-1 min-h-[260px] lg:w-1/2">
              <SubjectPerformanceChart data={subjectPerformance} />
            </div>
          </div>

          {/* TODAY'S SCHEDULE */}
          <div className="bg-white p-4 rounded-md">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Today&apos;s Schedule</h1>
              <Link href="/list/timetable" className="text-xs text-gray-400">
                View Timetable
              </Link>
            </div>
            {todayDayOfWeek === null ? (
              <p className="text-sm text-gray-400 mt-4">
                It&apos;s the weekend — enjoy your day off!
              </p>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                {todaySlots.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No lessons scheduled for today.
                  </p>
                )}
                {todaySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-4 p-3 rounded-md bg-kamal-sky-light"
                  >
                    <div className="w-20 shrink-0 text-center">
                      <p className="text-sm font-semibold text-gray-700">
                        {slot.period.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {timeFormat.format(slot.period.startTime)}
                      </p>
                    </div>
                    <div className="h-8 w-1 bg-kamal-sky rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {slot.classSubject?.subject.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Class {slot.classSubject?.class.name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {timeFormat.format(slot.period.startTime)} -{" "}
                      {timeFormat.format(slot.period.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MY CLASSES / EXAMS / ASSIGNMENTS */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* MY CLASSES & SUBJECTS */}
            <div className="flex-1 bg-white p-4 rounded-md">
              <h1 className="text-xl font-semibold">My Classes & Subjects</h1>
              <div className="flex flex-col gap-4 mt-4">
                {supervisedClasses.length === 0 && (
                  <p className="text-sm text-gray-400">
                    You don&apos;t supervise any classes yet.
                  </p>
                )}
                {supervisedClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-kamal-purple-light transition-colors"
                  >
                    <div>
                      <h2 className="font-medium text-sm">
                        {classItem.name}{" "}
                        <span className="text-xs text-gray-400">(homeroom)</span>
                      </h2>
                    </div>
                    <span className="text-xs bg-kamal-yellow-light text-gray-600 px-2 py-1 rounded-full">
                      {classItem._count.students} students
                    </span>
                  </div>
                ))}
                {profile && profile.subjects.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Subjects you teach</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.subjects.map((subject) => (
                        <span
                          key={subject.name}
                          className="text-xs bg-kamal-sky-light text-gray-700 px-3 py-1 rounded-full"
                        >
                          {subject.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* UPCOMING EXAMS */}
            <div className="flex-1 bg-white p-4 rounded-md">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Upcoming Exams</h1>
                <Link href="/list/exams" className="text-xs text-gray-400">
                  View All
                </Link>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                {upcomingExams.length === 0 && (
                  <p className="text-sm text-gray-400">No upcoming exams.</p>
                )}
                {upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-kamal-purple-light transition-colors"
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
            <div className="flex-1 bg-white p-4 rounded-md">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Assignments</h1>
                <Link href="/list/assignments" className="text-xs text-gray-400">
                  View All
                </Link>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                {upcomingAssignments.length === 0 && (
                  <p className="text-sm text-gray-400">No assignments yet.</p>
                )}
                {upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-kamal-purple-light transition-colors"
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
        </div>

        {/* RIGHT */}
        <div className="w-full xl:w-1/3 flex flex-col gap-4">
          {/* TAKE ATTENDANCE */}
          <Link
            href="/list/attendance/take"
            className="bg-white p-4 rounded-md flex items-center justify-between hover:bg-kamal-purple-light transition-colors"
          >
            <div>
              <h1 className="text-xl font-semibold">Take Attendance</h1>
              <p className="text-xs text-gray-400 mt-1">
                Mark attendance for your classes
              </p>
            </div>
            <Image src="/attendance.png" alt="" width={24} height={24} />
          </Link>
          <EventCalendar events={eventItems} />
          <Announcements items={announcementItems} />

          {/* RECENT LOGBOOK */}
          <div className="bg-white p-4 rounded-md">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Recent Teaching</h1>
              <Link href="/list/logbook" className="text-xs text-gray-400">
                View All
              </Link>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              {recentLogbook.length === 0 && (
                <p className="text-sm text-gray-400">No logbook entries yet.</p>
              )}
              {recentLogbook.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div>
                    <h2 className="font-medium text-sm">{entry.topic}</h2>
                    <p className="text-xs text-gray-400">
                      {entry.classSubject.subject.name} ·{" "}
                      {entry.classSubject.class.name}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {dateFormat.format(entry.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPage;
