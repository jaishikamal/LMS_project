"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveStaffAttendance } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  staffAttendanceSchema,
  type StaffAttendanceInput,
  type StaffAttendanceSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import SelectField from "../SelectField";
import type { RelatedData } from "../FormModal";

/** Yields YYYY-MM-DD for a date input. */
const toDateInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const STATUS_OPTIONS = [
  { value: "Present", label: "Present" },
  { value: "Absent", label: "Absent" },
  { value: "Leave", label: "Leave" },
];

const StaffAttendanceForm = ({
  type,
  data,
  relatedData,
  onSuccess,
}: {
  type: "create" | "update";
  data?: any;
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
  } = useForm<StaffAttendanceInput, unknown, StaffAttendanceSchema>({
    resolver: zodFormResolver(staffAttendanceSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveStaffAttendance(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Attendance marked!" : "Attendance updated!"
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
      <h1 className="text-xl font-semibold">Staff Attendance</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SelectField
          label="Staff Member"
          name="staffId"
          register={register}
          options={relatedData?.staff ?? []}
          defaultValue={data?.staffId}
          error={errors.staffId}
          placeholder="Select a staff member"
        />
        <InputField
          label="Date"
          name="date"
          type="date"
          defaultValue={toDateInput(data?.date)}
          register={register}
          error={errors.date}
        />
        <SelectField
          label="Status"
          name="status"
          register={register}
          options={STATUS_OPTIONS}
          defaultValue={data?.status ?? "Present"}
          error={errors.status}
          placeholder="Select status"
        />
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : type === "create" ? "Mark" : "Update"}
      </button>
    </form>
  );
};

export default StaffAttendanceForm;
