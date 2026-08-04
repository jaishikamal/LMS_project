"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveStaffPerformance } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  staffPerformanceSchema,
  type StaffPerformanceInput,
  type StaffPerformanceSchema,
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

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: `${value} star${value === 1 ? "" : "s"}`,
}));

const StaffPerformanceForm = ({
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
  } = useForm<StaffPerformanceInput, unknown, StaffPerformanceSchema>({
    resolver: zodFormResolver(staffPerformanceSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveStaffPerformance(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Review added!" : "Review updated!"
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
        {type === "create" ? "Add a performance review" : "Update review"}
      </h1>

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
          label="Review Date"
          name="reviewDate"
          type="date"
          defaultValue={toDateInput(data?.reviewDate)}
          register={register}
          error={errors.reviewDate}
        />
        <SelectField
          label="Rating"
          name="rating"
          register={register}
          options={RATING_OPTIONS}
          defaultValue={data?.rating}
          error={errors.rating}
          placeholder="Select a rating"
        />
        <InputField
          label="Comments"
          name="comments"
          defaultValue={data?.comments}
          register={register}
          error={errors.comments}
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

export default StaffPerformanceForm;
