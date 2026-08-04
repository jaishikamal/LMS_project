import StaffAttendanceSheet from "@/components/StaffAttendanceSheet";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";

const TakeStaffAttendancePage = async () => {
  await requirePermission("staff.attendance.manage");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [staff, existing] = await Promise.all([
    prisma.staff.findMany({
      select: { id: true, name: true, surname: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.staffAttendance.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      select: { staffId: true, status: true },
    }),
  ]);

  const defaultStatuses: Record<string, string> = {};
  for (const record of existing) {
    defaultStatuses[record.staffId] = record.status;
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <h1 className="hidden md:block text-lg font-semibold mb-4">
        Mark Staff Attendance
      </h1>
      <StaffAttendanceSheet staff={staff} defaultStatuses={defaultStatuses} />
    </div>
  );
};

export default TakeStaffAttendancePage;
