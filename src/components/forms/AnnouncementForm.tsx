"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveAnnouncement } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  announcementSchema,
  type AnnouncementInput,
  type AnnouncementSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import SelectField from "../SelectField";
import type { RelatedData } from "../FormModal";

const toDateInput = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const AnnouncementForm = ({
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
  } = useForm<AnnouncementInput, unknown, AnnouncementSchema>({
    resolver: zodFormResolver(announcementSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveAnnouncement(state, {
        ...values,
        id: data?.id,
      });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Announcement created!" : "Announcement updated!"
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
        {type === "create" ? "Create a new announcement" : "Update announcement"}
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
          label="Description"
          name="description"
          defaultValue={data?.description}
          register={register}
          error={errors.description}
        />
        <InputField
          label="Date"
          name="date"
          type="date"
          defaultValue={toDateInput(data?.date)}
          register={register}
          error={errors.date}
        />
        <SelectField
          label="Class (blank = school-wide)"
          name="classId"
          register={register}
          options={relatedData?.classes ?? []}
          defaultValue={data?.classId ?? ""}
          error={errors.classId}
          placeholder="All classes"
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

export default AnnouncementForm;
