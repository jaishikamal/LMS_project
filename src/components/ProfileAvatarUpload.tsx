"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { updateProfileImage } from "@/lib/actions";

const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Profile photo with an upload button overlay. Uses the same unsigned
 * Cloudinary widget as the forms; the resulting URL is persisted through the
 * `updateProfileImage` server action and the page refreshes to show it.
 */
const ProfileAvatarUpload = ({
  avatar,
  editable,
}: {
  avatar: string;
  editable: boolean;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (url: string) => {
    startTransition(async () => {
      const result = await updateProfileImage(url);
      if (result.success) {
        toast.success("Profile photo updated!");
        router.refresh();
      } else if (result.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  const photo = (
    <Image
      src={avatar}
      alt="Profile"
      width={96}
      height={96}
      className="w-24 h-24 rounded-2xl object-cover bg-white p-1 shadow-lg"
    />
  );

  if (!uploadPreset || !editable) {
    return <div className="w-24 h-24 shrink-0">{photo}</div>;
  }

  return (
    <CldUploadWidget
      uploadPreset={uploadPreset}
      options={{
        multiple: false,
        maxFiles: 1,
        resourceType: "image",
        maxFileSize: 5_000_000,
        clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
      }}
      onSuccess={(result) => {
        const info = result?.info;
        if (info && typeof info !== "string" && "secure_url" in info) {
          setError(null);
          save(info.secure_url as string);
        }
      }}
      onError={(uploadError) => {
        const message =
          typeof uploadError === "string"
            ? uploadError
            : (uploadError as { statusText?: string })?.statusText ||
            "Upload failed. Check the Cloudinary upload preset.";
        setError(message);
      }}
    >
      {({ open }) => (
        <button
          type="button"
          onClick={() => open()}
          disabled={isPending}
          aria-label="Change profile photo"
          className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden group disabled:opacity-60"
        >
          {photo}
          <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
            {isPending ? "Saving..." : "Change"}
          </span>
        </button>
      )}
    </CldUploadWidget>
  );
};

export default ProfileAvatarUpload;
