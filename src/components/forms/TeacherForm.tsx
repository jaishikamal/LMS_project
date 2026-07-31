"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveTeacher } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  teacherSchema,
  type TeacherInput,
  type TeacherSchema,
} from "@/lib/formSchemas";
import ImageUploadField from "../ImageUploadField";
import InputField from "../InputField";
import SelectField, { type SelectOption } from "../SelectField";
import { useState } from "react";

/** Yields YYYY-MM-DD for a date input's defaultValue. */
const toDateInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString().slice(0, 10);
};

const TeacherForm = ({
  type,
  data,
  relatedData,
  onSuccess,
}: {
  type: "create" | "update";
  data?: any;
  relatedData?: { subjects?: SelectOption[] };
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
    setValue,
    formState: { errors },
  } = useForm<TeacherInput, unknown, TeacherSchema>({
    resolver: zodFormResolver(teacherSchema),
    defaultValues: { id: data?.id, img: data?.img ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveTeacher(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Teacher created!" : "Teacher updated!"
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
        {type === "create" ? "Create a new teacher" : "Update teacher"}
      </h1>

      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label={type === "create" ? "Password" : "Password (leave blank to keep)"}
          name="password"
          type="password"
          register={register}
          error={errors?.password}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="First Name"
          // List rows carry a joined display name, so prefer the raw first name.
          name="name"
          defaultValue={data?.firstName ?? data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Last Name"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors.surname}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        <InputField
          label="Blood Type"
          name="bloodType"
          defaultValue={data?.bloodType}
          register={register}
          error={errors.bloodType}
        />
        <InputField
          label="Birthday"
          name="birthday"
          type="date"
          defaultValue={toDateInput(data?.birthday)}
          register={register}
          error={errors.birthday}
        />
        <SelectField
          label="Sex"
          name="sex"
          register={register}
          defaultValue={data?.sex}
          error={errors.sex}
          options={[
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
          ]}
        />
        {relatedData?.subjects && (
          <SelectField
            label="Subjects"
            name="subjects"
            multiple
            register={register}
            options={relatedData.subjects}
            defaultValue={data?.subjectIds}
            error={errors.subjects}
          />
        )}
        {/* The widget writes the Cloudinary URL straight into the `img` field. */}
        <input type="hidden" {...register("img")} />
        <ImageUploadField
          defaultValue={data?.img}
          onChange={(url) => setValue("img", url, { shouldValidate: true })}
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

export default TeacherForm;
