"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveInventoryIssue } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  inventoryIssueSchema,
  type InventoryIssueInput,
  type InventoryIssueSchema,
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

const BORROWER_OPTIONS = [
  { value: "Student", label: "Student" },
  { value: "Teacher", label: "Teacher" },
  { value: "Staff", label: "Staff" },
];

const InventoryIssueForm = ({
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
  } = useForm<InventoryIssueInput, unknown, InventoryIssueSchema>({
    resolver: zodFormResolver(inventoryIssueSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveInventoryIssue(state, {
        ...values,
        id: data?.id,
      });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Item issued!" : "Issue record updated!"
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
      <h1 className="text-xl font-semibold">Inventory Issue</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SelectField
          label="Item"
          name="itemId"
          register={register}
          options={relatedData?.inventoryItems ?? []}
          defaultValue={data?.itemId}
          error={errors.itemId}
          placeholder="Select an item"
        />
        <SelectField
          label="Borrower Type"
          name="borrowerType"
          register={register}
          options={BORROWER_OPTIONS}
          defaultValue={data?.borrowerType ?? "Student"}
          error={errors.borrowerType}
          placeholder="Select a type"
        />
        <InputField
          label="Borrower"
          name="borrowerName"
          defaultValue={data?.borrowerName}
          register={register}
          error={errors.borrowerName}
        />
        <InputField
          label="Issue Date"
          name="issuedDate"
          type="date"
          defaultValue={toDateInput(data?.issuedDate)}
          register={register}
          error={errors.issuedDate}
        />
        <InputField
          label="Due Date"
          name="dueDate"
          type="date"
          defaultValue={toDateInput(data?.dueDate)}
          register={register}
          error={errors.dueDate}
        />
        <InputField
          label="Returned Date"
          name="returnedDate"
          type="date"
          defaultValue={toDateInput(data?.returnedDate)}
          register={register}
          error={errors.returnedDate}
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
        {isPending ? "Saving..." : type === "create" ? "Issue" : "Update"}
      </button>
    </form>
  );
};

export default InventoryIssueForm;
