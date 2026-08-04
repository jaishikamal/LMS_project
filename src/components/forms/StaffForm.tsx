"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveStaff } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  staffSchema,
  type StaffInput,
  type StaffSchema,
} from "@/lib/formSchemas";
import ImageUploadField from "../ImageUploadField";
import InputField from "../InputField";
import SelectField from "../SelectField";

/** Yields YYYY-MM-DD for a date input. */
const toDateInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const SEX_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const StaffForm = ({
  type,
  data,
  onSuccess,
}: {
  type: "create" | "update";
  data?: any;
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
  } = useForm<StaffInput, unknown, StaffSchema>({
    resolver: zodFormResolver(staffSchema),
    defaultValues: { id: data?.id, img: data?.img ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveStaff(state, values);
      setState(result);

      if (result.success) {
        toast.success(type === "create" ? "Staff member added!" : "Staff member updated!");
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
        {type === "create" ? "Add a staff member" : "Update staff member"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <InputField
          label="Staff ID"
          name="id"
          defaultValue={data?.id}
          register={register}
          error={errors.id}
          inputProps={{ disabled: type === "update" }}
        />
        <InputField
          label="Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Surname"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors.surname}
        />
        <InputField
          label="Role"
          name="role"
          defaultValue={data?.role}
          register={register}
          error={errors.role}
        />
        <InputField
          label="Department"
          name="department"
          defaultValue={data?.department}
          register={register}
          error={errors.department}
        />
        <InputField
          label="Join Date"
          name="joinDate"
          type="date"
          defaultValue={toDateInput(data?.joinDate)}
          register={register}
          error={errors.joinDate}
        />
        <InputField
          label="Birthday"
          name="birthday"
          type="date"
          defaultValue={toDateInput(data?.birthday)}
          register={register}
          error={errors.birthday}
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
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        <SelectField
          label="Sex"
          name="sex"
          register={register}
          options={SEX_OPTIONS}
          defaultValue={data?.sex}
          error={errors.sex}
          placeholder="Select sex"
        />
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

export default StaffForm;
