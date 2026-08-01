"use client";

import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { useState } from "react";

type ImageUploadFieldProps = {
  /** Current value (a Cloudinary secure_url) — used to seed the preview. */
  defaultValue?: string | null;
  /** Called with the uploaded image URL so the parent form can register it. */
  onChange: (url: string) => void;
  label?: string;
};

const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Wraps Cloudinary's unsigned upload widget. Unsigned keeps the API secret
 * off the client entirely — the browser only ever sees the cloud name and
 * the preset name, both of which are safe to expose.
 */
const ImageUploadField = ({
  defaultValue,
  onChange,
  label = "Photo",
}: ImageUploadFieldProps) => {
  const [preview, setPreview] = useState<string | null>(defaultValue ?? null);
  const [error, setError] = useState<string | null>(null);

  // Without a preset the widget can't open, so say so instead of rendering a
  // button that silently does nothing.
  if (!uploadPreset) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs text-gray-500">{label}</label>
        <p className="text-xs text-amber-600">
          Image upload is unavailable: set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-xs text-gray-500">{label}</label>

      <CldUploadWidget
        uploadPreset={uploadPreset}
        options={{
          multiple: false,
          maxFiles: 1,
          resourceType: "image",
          // Keep uploads reasonable; the UI only ever shows a small avatar.
          maxFileSize: 5_000_000,
          clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
        }}
        onSuccess={(result) => {
          const info = result?.info;
          if (info && typeof info !== "string" && "secure_url" in info) {
            const url = info.secure_url as string;
            setPreview(url);
            setError(null);
            onChange(url);
          }
        }}
        onError={(uploadError) => {
          // A misconfigured preset (bad folder, still signed, wrong name)
          // otherwise fails silently inside the widget iframe.
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
            className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer"
          >
            <Image src="/upload.png" alt="" width={28} height={28} />
            <span>{preview ? "Change photo" : "Upload a photo"}</span>
          </button>
        )}
      </CldUploadWidget>

      {preview && (
        <Image
          src={preview}
          alt="Selected photo"
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover"
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default ImageUploadField;
