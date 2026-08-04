"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { getAttendanceRoster, saveBulkAttendance } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";

type ClassSubjectOption = {
  value: number;
  label: string;
};

type RosterItem = {
  studentId: string;
  name: string;
  surname: string;
  present: boolean | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

const toDateInput = (value?: Date | string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const today = () => toDateInput(new Date())!;

const AttendanceSheet = ({ classSubjects }: { classSubjects: ClassSubjectOption[] }) => {
  const router = useRouter();
  const [classSubjectId, setClassSubjectId] = useState("");
  const [date, setDate] = useState(today);
  const [students, setStudents] = useState<RosterItem[]>([]);
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({ success: false, error: null });
  const requestId = useRef(0);

  const loadRoster = useCallback(async (nextClassSubjectId: string, nextDate: string) => {
    const id = ++requestId.current;
    if (!nextClassSubjectId || !nextDate) {
      setLoading(false);
      setStudents([]);
      setStatuses({});
      return;
    }
    setLoading(true);
    const result = await getAttendanceRoster(Number(nextClassSubjectId), nextDate);
    if (id !== requestId.current) return;
    setLoading(false);

    if (!("students" in result)) {
      if (result.error) toast.error(result.error);
      setStudents([]);
      setStatuses({});
      return;
    }

    const items = result.students;
    setStudents(items);
    // Students without a record yet default to Present.
    setStatuses(
      Object.fromEntries(items.map((item) => [item.studentId, item.present ?? true]))
    );
  }, []);

  const handleClassSubjectChange = (value: string) => {
    setClassSubjectId(value);
    loadRoster(value, date);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    if (classSubjectId) loadRoster(classSubjectId, value);
  };

  const setAll = (present: boolean) => {
    setStatuses(
      Object.fromEntries(students.map((student) => [student.studentId, present]))
    );
  };

  const counts = students.reduce(
    (acc, student) => {
      if (statuses[student.studentId]) acc.present += 1;
      else acc.absent += 1;
      return acc;
    },
    { present: 0, absent: 0 }
  );

  const onSubmit = () => {
    if (!classSubjectId || !date || students.length === 0) return;
    startTransition(async () => {
      const result = await saveBulkAttendance(state, {
        classSubjectId: Number(classSubjectId),
        date,
        records: students.map((student) => ({
          studentId: student.studentId,
          present: statuses[student.studentId] ?? true,
        })),
      });
      setState(result);

      if (result.success) {
        toast.success("Attendance saved!");
        router.refresh();
        loadRoster(classSubjectId, date);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Take Attendance</h1>
      </div>

      {/* SELECTORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Class Subject</label>
          <select
            value={classSubjectId}
            onChange={(e) => handleClassSubjectChange(e.target.value)}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          >
            <option value="">Select a class subject</option>
            {classSubjects.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          />
        </div>
      </div>

      {/* SUMMARY + QUICK ACTIONS */}
      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              {counts.present} Present
            </span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
              {counts.absent} Absent
            </span>
            <span className="text-gray-500 text-xs">
              {students.length} students
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAll(true)}
              className="text-xs px-3 py-1.5 rounded-md border border-green-500 text-green-700 hover:bg-green-50"
            >
              All present
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="text-xs px-3 py-1.5 rounded-md border border-red-500 text-red-700 hover:bg-red-50"
            >
              All absent
            </button>
          </div>
        </div>
      )}

      {/* ROSTER */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading roster...</p>
      ) : classSubjectId && date ? (
        students.length === 0 ? (
          <p className="text-sm text-gray-400">
            No students are enrolled in this class.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
            {students.map((student) => (
              <li
                key={student.studentId}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium">
                  {student.name} {student.surname}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setStatuses((prev) => ({ ...prev, [student.studentId]: true }))
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      statuses[student.studentId]
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-green-50"
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setStatuses((prev) => ({ ...prev, [student.studentId]: false }))
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      statuses[student.studentId] === false
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-red-50"
                    }`}
                  >
                    Absent
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-sm text-gray-400">
          Pick a class subject and a date to load the roster.
        </p>
      )}

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || !classSubjectId || !date || students.length === 0}
          className="bg-blue-400 text-white px-6 py-2 rounded-md disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save attendance"}
        </button>
      </div>
    </div>
  );
};

export default AttendanceSheet;
