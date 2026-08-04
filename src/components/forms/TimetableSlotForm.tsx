"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveTimetableSlot } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  timetableSlotSchema,
  type TimetableSlotInput,
  type TimetableSlotSchema,
} from "@/lib/formSchemas";
import SelectField from "../SelectField";
import type { RelatedData } from "../FormModal";

const DAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
];

const TimetableSlotForm = ({
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
  } = useForm<TimetableSlotInput, unknown, TimetableSlotSchema>({
    resolver: zodFormResolver(timetableSlotSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveTimetableSlot(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Timetable slot created!" : "Timetable slot updated!"
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
        {type === "create" ? "Schedule a timetable slot" : "Update timetable slot"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SelectField
          label="Class"
          name="classId"
          register={register}
          options={relatedData?.classes ?? []}
          defaultValue={data?.classId}
          error={errors.classId}
          placeholder="Select a class"
        />
        <SelectField
          label="Day"
          name="dayOfWeek"
          register={register}
          options={DAYS}
          defaultValue={data?.dayOfWeek}
          error={errors.dayOfWeek}
          placeholder="Select a day"
        />
        <SelectField
          label="Period"
          name="periodId"
          register={register}
          options={relatedData?.periods ?? []}
          defaultValue={data?.periodId}
          error={errors.periodId}
          placeholder="Select a period"
        />
        <SelectField
          label="Class Subject (optional)"
          name="classSubjectId"
          register={register}
          options={relatedData?.classSubjects ?? []}
          defaultValue={data?.classSubjectId}
          error={errors.classSubjectId}
          placeholder="Select a subject"
        />
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default TimetableSlotForm;
