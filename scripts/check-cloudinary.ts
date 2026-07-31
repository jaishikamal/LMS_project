import "dotenv/config";

/**
 * Verifies that the configured Cloudinary unsigned upload preset actually
 * works, by uploading a 1x1 PNG. Useful because a misconfigured preset fails
 * silently inside the browser widget.
 *
 * Run with: npx tsx scripts/check-cloudinary.ts
 */

const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// A 1x1 transparent PNG, so the probe uploads essentially nothing.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

(async () => {
  console.log("cloud name:", cloud || "(missing)");
  console.log("preset:    ", preset || "(empty)");

  if (!cloud || !preset) {
    console.log("\nFAIL: set both NEXT_PUBLIC_CLOUDINARY_* vars in .env first.");
    process.exit(1);
  }

  const body = new FormData();
  body.append("file", TINY_PNG);
  body.append("upload_preset", preset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    { method: "POST", body }
  );
  const json: any = await res.json().catch(() => ({}));

  if (res.ok && json.secure_url) {
    console.log("\nPASS: unsigned upload succeeded");
    console.log("  public_id:", json.public_id);
    console.log("  url:      ", json.secure_url);
    return;
  }

  const message: string = json?.error?.message ?? `HTTP ${res.status}`;
  console.log(`\nFAIL: ${message}`);

  if (message.includes("Invalid folder")) {
    console.log(
      "  -> The preset's 'Folder' field is invalid. In the Cloudinary console open\n" +
      "     Settings > Upload > Upload presets > edit this preset, then either clear\n" +
      "     the Folder field or set it to a plain name like 'lms'. Save and re-run."
    );
  } else if (message.includes("whitelisted for unsigned")) {
    console.log("  -> Set the preset's Signing Mode to 'Unsigned' and re-run.");
  } else if (message.includes("not found")) {
    console.log("  -> No preset with that name exists on this cloud. Create it, or fix the name in .env.");
  }

  process.exit(1);
})();
