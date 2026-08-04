"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { savePayment } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  paymentSchema,
  type PaymentInput,
  type PaymentSchema,
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

const METHOD_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Card", label: "Card" },
  { value: "Mobile", label: "Mobile" },
];

const PaymentForm = ({
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
  } = useForm<PaymentInput, unknown, PaymentSchema>({
    resolver: zodFormResolver(paymentSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await savePayment(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Payment recorded!" : "Payment updated!"
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
      <h1 className="text-xl font-semibold">Payment</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SelectField
          label="Invoice"
          name="invoiceId"
          register={register}
          options={relatedData?.invoices ?? []}
          defaultValue={data?.invoiceId}
          error={errors.invoiceId}
          placeholder="Select an invoice"
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
          label="Method"
          name="method"
          register={register}
          options={METHOD_OPTIONS}
          defaultValue={data?.method ?? "Cash"}
          error={errors.method}
          placeholder="Select a method"
        />
        <InputField
          label="Date"
          name="date"
          type="date"
          defaultValue={toDateInput(data?.date)}
          register={register}
          error={errors.date}
        />
        <InputField
          label="Reference"
          name="reference"
          defaultValue={data?.reference ?? ""}
          register={register}
          error={errors.reference}
        />
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : type === "create" ? "Record" : "Update"}
      </button>
    </form>
  );
};

export default PaymentForm;
