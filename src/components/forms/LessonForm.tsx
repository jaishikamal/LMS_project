"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveLesson } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  lessonSchema,
  type LessonInput,
  type LessonSchema,
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

const LessonForm = ({
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
  } = useForm<LessonInput, unknown, LessonSchema>({
    resolver: zodFormResolver(lessonSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveLesson(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(type === "create" ? "Lesson created!" : "Lesson updated!");
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
        {type === "create" ? "Create a new lesson plan" : "Update lesson plan"}
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
          label="Topic"
          name="topic"
          defaultValue={data?.topic}
          register={register}
          error={errors.topic}
        />
        <InputField
          label="Objectives"
          name="objectives"
          defaultValue={data?.objectives}
          register={register}
          error={errors.objectives}
        />
        <InputField
          label="Materials"
          name="materials"
          defaultValue={data?.materials}
          register={register}
          error={errors.materials}
        />
        <InputField
          label="Start Date"
          name="startDate"
          type="date"
          defaultValue={toDateInput(data?.startDate)}
          register={register}
          error={errors.startDate}
        />
        <InputField
          label="End Date (optional)"
          name="endDate"
          type="date"
          defaultValue={toDateInput(data?.endDate)}
          register={register}
          error={errors.endDate}
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

export default LessonForm;
