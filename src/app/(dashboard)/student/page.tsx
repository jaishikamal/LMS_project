import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalender";
import EventCalendar from "@/components/EventCalendar";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveSelectedDay } from "@/lib/eventDay";
import { getRoleScope } from "@/lib/roleScope";
import { getScheduleEvents } from "@/lib/schedule";

const StudentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { userId } = await requireRole(["student"]);
  const { classIds } = await getRoleScope();

  // The calendar writes the picked day to `?date=`, so the events panel below
  // follows whatever day is selected.
  const { date } = await searchParams;
  const { start, end } = resolveSelectedDay(date);

  const [student, scheduleEvents, events, announcements] = await Promise.all([
    prisma.student.findUnique({
      where: { id: userId },
      select: { class: { select: { name: true } } },
    }),
    // A student's schedule is every lesson taught to their class.
    getScheduleEvents({ classId: { in: classIds ?? [] } }),
    prisma.event.findMany({
      where: {
        startTime: { gte: start, lt: end },
        OR: [{ classId: null }, { classId: { in: classIds ?? [] } }],
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.announcement.findMany({
      where: { OR: [{ classId: null }, { classId: { in: classIds ?? [] } }] },
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
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* Explicit height: BigCalendar sizes itself as a percentage of its
            parent, so an `h-full` here would collapse against the flex
            container's auto height. */}
        <div className="h-[800px] bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            Schedule{student?.class ? ` (${student.class.name})` : ""}
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

export default StudentPage;
