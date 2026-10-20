import type { z } from "zod";

export type FormValues = Record<string, string | string[]>;

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: FormValues;
  attempt?: string;
};

export const initialFormState: FormState = { status: "idle" };

function attemptId(): string {
  return globalThis.crypto.randomUUID();
}

export function errorState(message: string, fieldErrors?: FormState["fieldErrors"]): FormState {
  return { status: "error", message, fieldErrors, attempt: attemptId() };
}

export function successState(message: string): FormState {
  return { status: "success", message, attempt: attemptId() };
}

export function withValues(state: FormState, formData: FormData): FormState {
  return { ...state, values: snapshot(formData) };
}

export function fieldsKey(state: FormState): string {
  return state.attempt ?? "initial";
}

export function snapshot(formData: FormData): FormValues {
  const values: FormValues = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) {
      continue;
    }
    const entries = formData.getAll(key).filter((entry): entry is string => typeof entry === "string");
    if (entries.length === 0) {
      continue;
    }
    values[key] = entries.length === 1 ? entries[0] : entries;
  }
  return values;
}

export function valueOf(values: FormValues | undefined, key: string, fallback: string): string {
  const value = values?.[key];
  return typeof value === "string" ? value : fallback;
}

export function valuesOf(values: FormValues | undefined, key: string, fallback: string[]): string[] {
  if (!values) {
    return fallback;
  }
  const value = values[key];
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

export function validationErrorState(error: z.ZodError, formData?: FormData): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ...errorState("Please correct the highlighted fields.", fieldErrors), values: formData ? snapshot(formData) : undefined };
}
