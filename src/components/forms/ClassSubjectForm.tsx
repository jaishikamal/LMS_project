"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveClassSubject } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  classSubjectSchema,
  type ClassSubjectInput,
  type ClassSubjectSchema,
} from "@/lib/formSchemas";
import SelectField from "../SelectField";
import type { SelectOption } from "../SelectField";

const ClassSubjectForm = ({
  type,
  data,
  relatedData,
  onSuccess,
}: {
  type: "create" | "update";
  data?: any;
  relatedData?: {
    subjects?: SelectOption[];
    classes?: SelectOption[];
    teachers?: SelectOption[];
  };
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
  } = useForm<ClassSubjectInput, unknown, ClassSubjectSchema>({
    resolver: zodFormResolver(classSubjectSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveClassSubject(state, {
        ...values,
        id: data?.id,
      });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create"
            ? "Class subject assigned!"
            : "Class subject updated!"
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
        {type === "create" ? "Assign a subject to a class" : "Update class subject"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {relatedData?.subjects ? (
          <SelectField
            label="Subject"
            name="subjectId"
            register={register}
            options={relatedData.subjects}
            defaultValue={data?.subjectId}
            error={errors.subjectId}
            placeholder="Select a subject"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            No subjects available.
          </p>
        )}
        {relatedData?.classes ? (
          <SelectField
            label="Class"
            name="classId"
            register={register}
            options={relatedData.classes}
            defaultValue={data?.classId}
            error={errors.classId}
            placeholder="Select a class"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            No classes available.
          </p>
        )}
        {relatedData?.teachers ? (
          <SelectField
            label="Teacher"
            name="teacherId"
            register={register}
            options={relatedData.teachers}
            defaultValue={data?.teacherId}
            error={errors.teacherId}
            placeholder="Select a teacher"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            No teachers available.
          </p>
        )}
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : type === "create" ? "Assign" : "Update"}
      </button>
    </form>
  );
};

export default ClassSubjectForm;
