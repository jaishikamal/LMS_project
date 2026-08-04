"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveAttendance } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  attendanceSchema,
  type AttendanceInput,
  type AttendanceSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import SelectField from "../SelectField";
import type { RelatedData } from "../FormModal";

const toDateInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const statusOptions = [
  { value: "true", label: "Present" },
  { value: "false", label: "Absent" },
];

const AttendanceForm = ({
  type,
  data,
  relatedData,
  onSuccess,
}: {
  type: "create" | "update";
  data?: any;
  /**
   * `classSubjects` and `students` are pre-filtered on the server: teachers
   * only see the subjects they teach and the students in those classes;
   * admins see everything.
   */
  relatedData?: RelatedData;
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({
    success: false,
    error: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttendanceInput, unknown, AttendanceSchema>({
    resolver: zodFormResolver(attendanceSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveAttendance(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Attendance recorded!" : "Attendance updated!"
        );
        router.refresh();
        onSuccess?.();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Mark attendance" : "Update attendance"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <InputField
          label="Date"
          name="date"
          type="date"
          defaultValue={toDateInput(data?.date)}
          register={register}
          error={errors.date}
        />
        {relatedData?.classSubjects ? (
          <SelectField
            label="Class Subject"
            name="classSubjectId"
            register={register}
            options={relatedData.classSubjects}
            defaultValue={data?.classSubjectId}
            error={errors.classSubjectId}
            placeholder="Select a class subject"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            No class subjects available.
          </p>
        )}
        {relatedData?.students ? (
          <SelectField
            label="Student"
            name="studentId"
            register={register}
            options={relatedData.students}
            defaultValue={data?.studentId}
            error={errors.studentId}
            placeholder="Select a student"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            No students available.
          </p>
        )}
        <SelectField
          label="Status"
          name="present"
          register={register}
          options={statusOptions}
          defaultValue={
            data?.present === false ? "false" : data?.present === true ? "true" : undefined
          }
          error={errors.present}
          placeholder="Select status"
        />
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : type === "create" ? "Save" : "Update"}
      </button>
    </form>
  );
};

export default AttendanceForm;
