"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveParent } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  parentSchema,
  type ParentInput,
  type ParentSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";

const ParentForm = ({
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
    formState: { errors },
  } = useForm<ParentInput, unknown, ParentSchema>({
    resolver: zodFormResolver(parentSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveParent(state, { ...values, id: data?.id });
      setState(result);

      if (result.success) {
        toast.success(type === "create" ? "Parent created!" : "Parent updated!");
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
        {type === "create" ? "Create a new parent" : "Update parent"}
      </h1>

      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <InputField
          label="First Name"
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

export default ParentForm;
