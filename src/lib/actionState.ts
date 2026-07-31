/**
 * Shared result shape for the form server actions.
 *
 * This lives outside `actions.ts` on purpose: a `"use server"` module may only
 * export async functions, so a plain object/type export there fails at runtime
 * with "A 'use server' file can only export async functions, found object."
 */
export type ActionState = {
  success: boolean;
  error: string | null;
};

export const initialActionState: ActionState = { success: false, error: null };
