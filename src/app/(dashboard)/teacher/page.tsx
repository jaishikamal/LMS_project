import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalender";
import EventCalendar from "@/components/EventCalendar";
import UserCard from "@/components/UserCard";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { resolveSelectedDay } from "@/lib/eventDay";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";
import { getScheduleEvents } from "@/lib/schedule";

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

  const [
    scheduleEvents,
    classCount,
    lessonCount,
    subjectCount,
    studentCount,
    events,
    announcements,
  ] = await Promise.all([
    // A teacher's schedule is the lessons they personally teach.
    getScheduleEvents({ teacherId: userId }),
    prisma.class.count({ where: { id: { in: scopedClassIds } } }),
    prisma.lesson.count({ where: { teacherId: userId } }),
    prisma.subject.count({ where: { teachers: { some: { id: userId } } } }),
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
  ]);

  const timeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateFormat = new Intl.DateTimeFormat("en-US");

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

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 flex flex-col gap-8">
        {/* STAT CARDS */}
        <div className="flex gap-4 justify-between flex-wrap">
          <UserCard type="class" count={classCount} />
          <UserCard type="lesson" count={lessonCount} />
          <UserCard type="subject" count={subjectCount} />
          <UserCard type="student" count={studentCount} />
        </div>
        {/* SCHEDULE */}
        <div className="h-[800px] bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            {name ? `${name}'s Schedule` : "Schedule"}
          </h1>
          <BigCalendar events={scheduleEvents} />
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

export default TeacherPage;
