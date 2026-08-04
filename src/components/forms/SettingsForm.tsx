"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveSettings } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  settingsSchema,
  type SettingsInput,
  type SettingsSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import ImageUploadField from "../ImageUploadField";

export const SETTING_FIELDS: { key: string; label: string }[] = [
  { key: "schoolName", label: "School Name" },
  { key: "motto", label: "Motto" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "academicYear", label: "Academic Year" },
];

const SettingsForm = ({ data }: { data: Record<string, string> }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({
    success: false,
    error: null,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingsInput, unknown, SettingsSchema>({
    resolver: zodFormResolver(settingsSchema),
    defaultValues: {
      ...Object.fromEntries(
        SETTING_FIELDS.map((field) => [field.key, data[field.key] ?? ""])
      ),
      logo: data.logo ?? "",
    },
  });

  const logo = watch("logo") || data.logo || "/logo.png";
  const schoolName = watch("schoolName") || data.schoolName || "LMS";
  const motto = watch("motto") || "";

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveSettings(state, values);
      setState(result);

      if (result.success) {
        toast.success("Settings saved!");
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">School Settings</h1>

      <div className="flex items-center gap-3 border border-gray-200 rounded-md bg-[#F7F8FA] p-4">
        <Image
          src={logo}
          alt="School logo preview"
          width={48}
          height={48}
          className="w-12 h-12 rounded-md object-contain"
        />
        <div className="min-w-0">
          <span className="block text-lg font-semibold truncate">
            {schoolName}
          </span>
          {motto && (
            <span className="block text-xs text-gray-500 truncate">
              {motto}
            </span>
          )}
        </div>
        <span className="ml-auto text-xs text-gray-400 shrink-0">
          Live preview — shows in the sidebar and sign-in page once saved.
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <label className="text-xs text-gray-500">School Logo</label>
        <div className="flex items-center gap-4">
          <ImageUploadField
            label=""
            defaultValue={data.logo}
            onChange={(url) => setValue("logo", url)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SETTING_FIELDS.map((field) => (
          <InputField
            key={field.key}
            label={field.label}
            name={field.key}
            register={register}
            error={errors[field.key]}
          />
        ))}
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
};

export default SettingsForm;
