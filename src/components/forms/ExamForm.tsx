"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveExam } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  examSchema,
  type ExamInput,
  type ExamSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import SelectField from "../SelectField";
import type { RelatedData } from "../FormModal";

/** Yields YYYY-MM-DDTHH:mm suitable for a datetime-local input. */
const toDateTimeInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const ExamForm = ({
  type,
  data,
  relatedData,
  onSuccess,
}: {
  type: "create" | "update";
  data?: any;
  /**
   * `classSubjects` should already be pre-filtered by the server to only the
   * subjects the current user teaches (teacher) or all of them (admin).
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
  } = useForm<ExamInput, unknown, ExamSchema>({
    resolver: zodFormResolver(examSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveExam(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(type === "create" ? "Exam created!" : "Exam updated!");
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
        {type === "create" ? "Create a new exam" : "Update exam"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <InputField
          label="Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors.title}
        />
        <InputField
          label="Start Time"
          name="startTime"
          type="datetime-local"
          defaultValue={toDateTimeInput(data?.startTime)}
          register={register}
          error={errors.startTime}
        />
        <InputField
          label="End Time"
          name="endTime"
          type="datetime-local"
          defaultValue={toDateTimeInput(data?.endTime)}
          register={register}
          error={errors.endTime}
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

export default ExamForm;
