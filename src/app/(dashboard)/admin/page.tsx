import Announcements from "@/components/Announcements";
import AttendanceChart from "@/components/AttendanceChart";
import CountChart from "@/components/CountChart";
import EventCalendar from "@/components/EventCalendar";
import FinanceChart from "@/components/FinanceChart";
import UserCard from "@/components/UserCard";
import { requireRole } from "@/lib/auth";
import { resolveSelectedDay } from "@/lib/eventDay";
import { UserSex } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const getAttendanceForLastWeek = async () => {
  // Group the last 7 days of attendance rows by day-of-week and present/absent.
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.attendance.findMany({
    where: { date: { gte: since } },
    select: { date: true, present: true },
  });

  const byDay = new Map<string, { present: number; absent: number }>();
  for (const row of rows) {
    const label = dayLabels[row.date.getDay()];
    const entry = byDay.get(label) ?? { present: 0, absent: 0 };
    if (row.present) entry.present += 1;
    else entry.absent += 1;
    byDay.set(label, entry);
  }

  // Mon-Fri, in order, matching the school week.
  return (["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map((name) => ({
    name,
    present: byDay.get(name)?.present ?? 0,
    absent: byDay.get(name)?.absent ?? 0,
  }));
};

const getEventsForDay = async (start: Date, end: Date) => {
  const events = await prisma.event.findMany({
    where: { startTime: { gte: start, lt: end } },
    orderBy: { startTime: "asc" },
  });

  const timeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    time: `${timeFormat.format(event.startTime)} - ${timeFormat.format(event.endTime)}`,
    description: event.description,
  }));
};

const getRecentAnnouncements = async () => {
  const announcements = await prisma.announcement.findMany({
    orderBy: { date: "desc" },
    take: 3,
  });

  const dateFormat = new Intl.DateTimeFormat("en-US");

  return announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    date: dateFormat.format(announcement.date),
  }));
};

const AdminPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requireRole(["admin"]);

  // The calendar writes the picked day to `?date=`, so the events panel below
  // follows whatever day is selected.
  const { date } = await searchParams;
  const { start, end } = resolveSelectedDay(date);

  const [
    studentCount,
    boysCount,
    girlsCount,
    teacherCount,
    parentCount,
    adminCount,
    attendanceData,
    dayEvents,
    recentAnnouncements,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { sex: UserSex.MALE } }),
    prisma.student.count({ where: { sex: UserSex.FEMALE } }),
    prisma.teacher.count(),
    prisma.parent.count(),
    prisma.admin.count(),
    getAttendanceForLastWeek(),
    getEventsForDay(start, end),
    getRecentAnnouncements(),
  ]);

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        {/* USER CARDS */}
        <div className="flex gap-4 justify-between flex-wrap">
          <UserCard type="student" count={studentCount} />
          <UserCard type="teacher" count={teacherCount} />
          <UserCard type="parent" count={parentCount} />
          <UserCard type="admin" count={adminCount} />
        </div>
        {/* MIDDLE CHARTS */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[450px]">
            <CountChart boys={boysCount} girls={girlsCount} />
          </div>
          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[450px]">
            <AttendanceChart data={attendanceData} />
          </div>
        </div>
        {/* BOTTOM CHART */}
        <div className="w-full h-[500px]">
          {/* No finance/payment model exists in the schema yet, so this
              stays illustrative until that data is tracked. */}
          <FinanceChart />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendar events={dayEvents} />
        <Announcements items={recentAnnouncements} />
      </div>
    </div>
  );
};

export default AdminPage;
