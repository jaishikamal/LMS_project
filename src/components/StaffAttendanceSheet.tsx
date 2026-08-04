"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { saveBulkStaffAttendance } from "@/lib/actions";

type StaffMember = {
  id: string;
  name: string;
  surname: string;
  role: string;
};

const STATUS_OPTIONS = ["Present", "Absent", "Leave"];

const toDateInput = (value: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const StaffAttendanceSheet = ({
  staff,
  defaultStatuses,
}: {
  staff: StaffMember[];
  defaultStatuses: Record<string, string>;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(toDateInput(new Date()));
  const [statuses, setStatuses] = useState<Record<string, string>>(defaultStatuses);

  const handleSubmit = () => {
    const records = staff
      .filter((member) => statuses[member.id])
      .map((member) => ({ staffId: member.id, status: statuses[member.id] }));

    if (records.length === 0) {
      toast.error("Mark at least one staff member.");
      return;
    }

    startTransition(async () => {
      const result = await saveBulkStaffAttendance(
        { success: false, error: null },
        { date: new Date(`${date}T00:00:00`), records }
      );
      if (result.success) {
        toast.success("Attendance saved!");
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <label className="text-sm font-medium flex items-center gap-2">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm px-3 py-2 rounded-md border border-gray-300"
          />
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60 px-6"
        >
          {isPending ? "Saving..." : "Save attendance"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-kamal-sky text-white">
              <th className="p-3 text-left">Staff Member</th>
              <th className="p-3 text-left hidden md:table-cell">Role</th>
              <th className="p-3 text-center w-40">Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-t border-gray-200">
                <td className="p-3 font-medium">
                  {member.name} {member.surname}
                </td>
                <td className="p-3 hidden md:table-cell">{member.role}</td>
                 <td className="p-3 text-center">
                   <select
                     value={statuses[member.id] ?? ""}
                     onChange={(e) =>
                       setStatuses((prev) => ({ ...prev, [member.id]: e.target.value }))
                     }
                     className="text-sm px-2 py-1 border border-gray-300 rounded-md"
                   >
                     <option value="">--</option>
                     {STATUS_OPTIONS.map((status) => (
                       <option key={status} value={status}>
                         {status}
                       </option>
                     ))}
                   </select>
                 </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  No staff members yet. Add staff first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffAttendanceSheet;
