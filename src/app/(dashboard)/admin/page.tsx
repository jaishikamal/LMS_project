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

// Income = payments received, expense = recorded expenses, grouped by month
// over the last 12 months so the finance chart reflects real data.
const getFinanceSeries = async () => {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({ select: { amount: true, date: true } }),
    prisma.expense.findMany({ select: { amount: true, date: true } }),
  ]);

  const monthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const incomeByMonth = new Map<string, number>();
  for (const payment of payments) {
    const key = monthKey(payment.date);
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + Number(payment.amount));
  }

  const expenseByMonth = new Map<string, number>();
  for (const expense of expenses) {
    const key = monthKey(expense.date);
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + Number(expense.amount));
  }

  const now = new Date();
  const names = new Intl.DateTimeFormat("en-US", { month: "short" });
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = monthKey(date);
    return {
      name: names.format(date),
      income: incomeByMonth.get(key) ?? 0,
      expense: expenseByMonth.get(key) ?? 0,
    };
  });
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
    financeData,
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
    getFinanceSeries(),
  ]);

  return (
    <div className="h-full min-h-0 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* USER CARDS */}
        <div className="flex gap-4 justify-between flex-wrap shrink-0">
          <UserCard type="student" count={studentCount} />
          <UserCard type="teacher" count={teacherCount} />
          <UserCard type="parent" count={parentCount} />
          <UserCard type="admin" count={adminCount} />
        </div>
        {/* MIDDLE CHARTS */}
        <div className="flex-1 min-h-0 flex gap-4 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="flex-1 min-h-0 lg:w-1/3">
            <CountChart boys={boysCount} girls={girlsCount} />
          </div>
          {/* ATTENDANCE + FINANCE CHARTS */}
          <div className="flex-1 min-h-0 lg:w-2/3 flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <AttendanceChart data={attendanceData} />
            </div>
            <div className="flex-1 min-h-0">
              <FinanceChart data={financeData} />
            </div>
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 min-h-0 flex flex-col gap-4 overflow-y-auto">
        <EventCalendar events={dayEvents} />
        <Announcements items={recentAnnouncements} />
      </div>
    </div>
  );
};

export default AdminPage;
