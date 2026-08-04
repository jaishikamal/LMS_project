"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveInventoryItem } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  inventoryItemSchema,
  type InventoryItemInput,
  type InventoryItemSchema,
} from "@/lib/formSchemas";
import InputField from "../InputField";
import SelectField from "../SelectField";

const CATEGORY_OPTIONS = [
  { value: "Books", label: "Books" },
  { value: "Supplies", label: "Supplies" },
  { value: "Equipment", label: "Equipment" },
];

const InventoryItemForm = ({
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
  } = useForm<InventoryItemInput, unknown, InventoryItemSchema>({
    resolver: zodFormResolver(inventoryItemSchema),
    defaultValues: { id: data?.id },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveInventoryItem(state, {
        ...values,
        id: data?.id,
      });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Item created!" : "Item updated!"
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
      <h1 className="text-xl font-semibold">Inventory Item</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <InputField
          label="Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <SelectField
          label="Category"
          name="category"
          register={register}
          options={CATEGORY_OPTIONS}
          defaultValue={data?.category ?? "Books"}
          error={errors.category}
          placeholder="Select a category"
        />
        <InputField
          label="Quantity"
          name="quantity"
          type="number"
          inputProps={{ min: 0 }}
          defaultValue={data?.quantity != null ? String(data.quantity) : ""}
          register={register}
          error={errors.quantity}
        />
        <InputField
          label="Location"
          name="location"
          defaultValue={data?.location ?? ""}
          register={register}
          error={errors.location}
        />
        <div className="sm:col-span-2 md:col-span-3">
          <InputField
            label="Description"
            name="description"
            defaultValue={data?.description ?? ""}
            register={register}
            error={errors.description}
            inputProps={{ className: "h-24" }}
          />
        </div>
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

export default InventoryItemForm;
