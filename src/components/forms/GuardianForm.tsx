"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveGuardian } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  guardianSchema,
  type GuardianInput,
  type GuardianSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import SelectField from "../SelectField";
import type { RelatedData } from "../FormModal";

const GuardianForm = ({
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
  } = useForm<GuardianInput, unknown, GuardianSchema>({
    resolver: zodFormResolver(guardianSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveGuardian(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Guardian added!" : "Guardian updated!"
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
        {type === "create" ? "Add a guardian" : "Update guardian"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {relatedData?.students ? (
          <SelectField
            label="Student"
            name="studentId"
            register={register}
            options={relatedData.students}
            defaultValue={data?.studentId}
            error={errors.studentId}
            placeholder="Select a student"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            No students available.
          </p>
        )}
        <InputField
          label="Full Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Relationship"
          name="relationship"
          defaultValue={data?.relationship}
          register={register}
          error={errors.relationship}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors.email}
        />
        <label className="flex items-end gap-2 text-sm font-medium pb-2">
          <input
            type="checkbox"
            className="w-4 h-4"
            {...register("isPrimary")}
            defaultChecked={data?.isPrimary}
          />
          Primary contact
        </label>
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

export default GuardianForm;
