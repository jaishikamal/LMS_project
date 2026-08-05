import "server-only";
import prisma from "@/lib/prisma";

export { ITEM_PER_PAGE } from "./constants";

/**
 * Loads the key/value settings table as a plain map. Used across server
 * components (dashboard layout, sign-in, printouts) so branding changes made
 * in Settings reflect everywhere immediately.
 */
export const getSettings = async (): Promise<Record<string, string>> => {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
};

export type SchoolSettings = {
  schoolName: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  academicYear: string;
  logo: string;
};

/** Branding values with sensible fallbacks before Settings is customised. */
export const getSchoolSettings = async (): Promise<SchoolSettings> => {
  let map: Record<string, string> = {};
  try {
    map = await getSettings();
  } catch {
    // DB unavailable (e.g. mid-prerender) — fall back to the defaults below.
  }
  return {
    schoolName: map.schoolName || "LMS",
    motto: map.motto ?? "",
    address: map.address ?? "",
    phone: map.phone ?? "",
    email: map.email ?? "",
    academicYear: map.academicYear ?? "",
    logo: map.logo || "/logo.png",
  };
};
