import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalender";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";
import { getScheduleEvents } from "@/lib/schedule";

const ParentPage = async () => {
  const { userId } = await requireRole(["parent"]);
  const { classIds } = await getRoleScope();

  const children = await prisma.student.findMany({
    where: { parentId: userId },
    select: { name: true, surname: true },
    orderBy: { name: "asc" },
  });

  // A parent's schedule view is the lessons of their children's classes.
  const scheduleEvents = await getScheduleEvents({
    classId: { in: classIds ?? [] },
  });

  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ classId: null }, { classId: { in: classIds ?? [] } }] },
    orderBy: { date: "desc" },
    take: 3,
  });

  const dateFormat = new Intl.DateTimeFormat("en-US");
  const announcementItems = announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    date: dateFormat.format(announcement.date),
  }));

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            Schedule
            {children.length > 0
              ? ` (${children.map((c) => `${c.name} ${c.surname}`).join(", ")})`
              : ""}
          </h1>
          <BigCalendar events={scheduleEvents} />
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
