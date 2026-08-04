"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { copyTimetable } from "@/lib/actions";
import FormModal from "./FormModal";
import type { RelatedData } from "./FormModal";

type PeriodOption = { id: number; name: string; startTime: string; endTime: string };
type ClassOption = { id: number; name: string };
type SlotData = {
  id: number;
  dayOfWeek: number;
  periodId: number;
  classSubjectId: number | null;
  classSubjectName: string | null;
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const toTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const CopyTimetableButton = ({
  fromClassId,
  toClassId,
}: {
  fromClassId: number | null;
  toClassId: number;
}) => {
  const [isPending, startTransition] = useTransition();

  const handleCopy = () => {
    if (!fromClassId) {
      toast.error("Pick a source class first.");
      return;
    }
    startTransition(async () => {
      const result = await copyTimetable(
        { success: false, error: null },
        {
          fromClassId,
          toClassId,
        }
      );
      if (result.success) {
        toast.success("Timetable copied!");
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isPending}
      className="bg-kamal-sky text-white text-sm px-4 py-2 rounded-md disabled:opacity-60"
    >
      {isPending ? "Copying..." : "Copy timetable"}
    </button>
  );
};

const TimetableGrid = ({
  periods,
  classes,
  classSubjects,
  slots,
  selectedClassId,
  role,
}: {
  periods: PeriodOption[];
  classes: ClassOption[];
  classSubjects: { value: number; label: string }[];
  slots: SlotData[];
  selectedClassId: number;
  role: string;
}) => {
  const router = useRouter();
  const [fromClassId, setFromClassId] = useState<number | null>(null);
  const canEdit = role === "admin" || role === "teacher";

  const slotsByKey = new Map(
    slots.map((slot) => [`${slot.dayOfWeek}-${slot.periodId}`, slot])
  );

  const relatedData: RelatedData = {
    classes: classes.map((classItem) => ({
      value: classItem.id,
      label: classItem.name,
    })),
    periods: periods.map((period) => ({
      value: period.id,
      label: `${period.name} (${toTime(period.startTime)}-${toTime(period.endTime)})`,
    })),
    classSubjects,
  };

  const cellData = (dayOfWeek: number, periodId: number, slot?: SlotData) => ({
    classId: selectedClassId,
    dayOfWeek,
    periodId,
    classSubjectId: slot?.classSubjectId ?? undefined,
    id: slot?.id,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <label className="text-sm font-medium flex items-center gap-2">
          Class
          <select
            value={selectedClassId}
            onChange={(e) => router.push(`/list/timetable?classId=${e.target.value}`)}
            className="text-sm px-3 py-2 rounded-md border border-gray-300"
          >
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        {canEdit && (
          <>
            <div className="flex items-center gap-2">
              <select
                value={fromClassId ?? ""}
                onChange={(e) => setFromClassId(e.target.value ? Number(e.target.value) : null)}
                className="text-sm px-3 py-2 rounded-md border border-gray-300"
              >
                <option value="">Copy from...</option>
                {classes
                  .filter((classItem) => classItem.id !== selectedClassId)
                  .map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
              </select>
              <CopyTimetableButton fromClassId={fromClassId} toClassId={selectedClassId} />
            </div>

            <div className="md:ml-auto flex items-center gap-2">
              <FormModal table="period" type="create" relatedData={relatedData} />
              <span className="text-sm text-gray-500">Add period</span>
            </div>
          </>
        )}
      </div>

      {/* GRID */}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-kamal-sky text-white">
              <th className="p-3 text-left">Period</th>
              {DAY_NAMES.map((day, index) => (
                <th key={day} className="p-3 text-center">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id} className="border-t border-gray-200">
                <td className="p-3 font-medium whitespace-nowrap">
                  <div>{period.name}</div>
                  <div className="text-xs text-gray-500">
                    {toTime(period.startTime)}-{toTime(period.endTime)}
                  </div>
                </td>
                {DAY_NAMES.map((_, index) => {
                  const dayOfWeek = index + 1;
                  const slot = slotsByKey.get(`${dayOfWeek}-${period.id}`);
                  return (
                    <td key={dayOfWeek} className="p-2 text-center">
                      {slot ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-medium">{slot.classSubjectName}</span>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <FormModal
                                table="timetableSlot"
                                type="update"
                                data={cellData(dayOfWeek, period.id, slot)}
                                relatedData={relatedData}
                              />
                              <FormModal table="timetableSlot" type="delete" id={slot.id} />
                            </div>
                          )}
                        </div>
                      ) : canEdit ? (
                        <FormModal
                          table="timetableSlot"
                          type="create"
                          data={cellData(dayOfWeek, period.id)}
                          relatedData={relatedData}
                        />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {periods.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No periods defined yet. Ask an admin to add periods first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimetableGrid;
