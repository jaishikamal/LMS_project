"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveLogbookEntry } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  logbookEntrySchema,
  type LogbookEntryInput,
  type LogbookEntrySchema,
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

const LogbookForm = ({
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
  } = useForm<LogbookEntryInput, unknown, LogbookEntrySchema>({
    resolver: zodFormResolver(logbookEntrySchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveLogbookEntry(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Logbook entry created!" : "Logbook entry updated!"
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
        {type === "create" ? "Record a logbook entry" : "Update logbook entry"}
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
        <InputField
          label="Topic"
          name="topic"
          defaultValue={data?.topic}
          register={register}
          error={errors.topic}
        />
        <InputField
          label="Summary"
          name="summary"
          defaultValue={data?.summary}
          register={register}
          error={errors.summary}
        />
        <InputField
          label="Homework (optional)"
          name="homework"
          defaultValue={data?.homework}
          register={register}
          error={errors.homework}
        />
        <InputField
          label="Notes (optional)"
          name="notes"
          defaultValue={data?.notes}
          register={register}
          error={errors.notes}
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

export default LogbookForm;
