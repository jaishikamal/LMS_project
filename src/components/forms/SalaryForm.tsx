"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveSalaryRecord } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  salaryRecordSchema,
  type SalaryRecordInput,
  type SalaryRecordSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import SelectField from "../SelectField";
import type { RelatedData } from "../FormModal";

/** Yields YYYY-MM for a month input. */
const toMonthInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};

/** Yields YYYY-MM-DD for a date input. */
const toDateInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const RECIPIENT_OPTIONS = [
  { value: "Staff", label: "Staff" },
  { value: "Teacher", label: "Teacher" },
];

const SalaryForm = ({
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
    watch,
    formState: { errors },
  } = useForm<SalaryRecordInput, unknown, SalaryRecordSchema>({
    resolver: zodFormResolver(salaryRecordSchema),
    defaultValues: {
      id: data?.id,
      recipientType: data?.recipientType ?? "Staff",
    },
  });

  const watchedType = watch("recipientType");

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveSalaryRecord(state, {
        ...values,
        id: data?.id,
      });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create"
            ? "Salary record created!"
            : "Salary record updated!"
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
      <h1 className="text-xl font-semibold">Salary Record</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SelectField
          label="Recipient Type"
          name="recipientType"
          register={register}
          options={RECIPIENT_OPTIONS}
          defaultValue={data?.recipientType ?? "Staff"}
          error={errors.recipientType}
          placeholder="Select type"
        />
        {watchedType === "Staff" ? (
          <SelectField
            label="Staff Member"
            name="staffId"
            register={register}
            options={relatedData?.staff ?? []}
            defaultValue={data?.staffId ?? ""}
            error={errors.staffId}
            placeholder="Select a staff member"
          />
        ) : (
          <SelectField
            label="Teacher"
            name="teacherId"
            register={register}
            options={relatedData?.teachers ?? []}
            defaultValue={data?.teacherId ?? ""}
            error={errors.teacherId}
            placeholder="Select a teacher"
          />
        )}
        <InputField
          label="Month"
          name="month"
          type="month"
          defaultValue={toMonthInput(data?.month)}
          register={register}
          error={errors.month}
        />
        <InputField
          label="Amount"
          name="amount"
          type="number"
          inputProps={{ step: "0.01" }}
          defaultValue={data?.amount != null ? String(Number(data.amount)) : ""}
          register={register}
          error={errors.amount}
        />
        <SelectField
          label="Paid"
          name="paid"
          register={register}
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
          defaultValue={data?.paid ? "true" : "false"}
          error={errors.paid}
          placeholder="Select status"
        />
        <InputField
          label="Paid Date"
          name="paidDate"
          type="date"
          defaultValue={toDateInput(data?.paidDate)}
          register={register}
          error={errors.paidDate}
        />
        <InputField
          label="Notes"
          name="notes"
          defaultValue={data?.notes ?? ""}
          register={register}
          error={errors.notes}
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

export default SalaryForm;
