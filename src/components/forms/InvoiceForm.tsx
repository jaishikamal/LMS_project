"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveInvoice } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  invoiceSchema,
  type InvoiceInput,
  type InvoiceSchema,
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

const InvoiceForm = ({
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
  } = useForm<InvoiceInput, unknown, InvoiceSchema>({
    resolver: zodFormResolver(invoiceSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveInvoice(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Invoice created!" : "Invoice updated!"
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
      <h1 className="text-xl font-semibold">Invoice</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <InputField
          label="Invoice No"
          name="invoiceNo"
          defaultValue={data?.invoiceNo}
          register={register}
          error={errors.invoiceNo}
        />
        <SelectField
          label="Student"
          name="studentId"
          register={register}
          options={relatedData?.students ?? []}
          defaultValue={data?.studentId}
          error={errors.studentId}
          placeholder="Select a student"
        />
        <SelectField
          label="Fee Item"
          name="feeItemId"
          register={register}
          options={relatedData?.feeItems ?? []}
          defaultValue={data?.feeItemId}
          error={errors.feeItemId}
          placeholder="Select a fee item"
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
        <InputField
          label="Due Date"
          name="dueDate"
          type="date"
          defaultValue={toDateInput(data?.dueDate)}
          register={register}
          error={errors.dueDate}
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

export default InvoiceForm;
