"use client";

import { useActionState, type ReactNode } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/lib/form-state";

type UploadAction = (state: FormState, formData: FormData) => Promise<FormState>;

export function DocumentUploadForm({
  action,
  hiddenFields,
  accept = "application/pdf,image/jpeg,image/png,image/webp",
  label,
  hint = "PDF, JPG, PNG or WebP, up to 10 MB.",
  children,
}: {
  action: UploadAction;
  hiddenFields: Record<string, string>;
  accept?: string;
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const inputId = `upload-${Object.values(hiddenFields).join("-")}`;
  const errors = state.fieldErrors?.file;

  return (
    <form action={formAction} className="grid gap-3">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <input
          id={inputId}
          name="file"
          type="file"
          accept={accept}
          required
          aria-invalid={errors?.length ? true : undefined}
          className="block w-full text-[14px] text-navy file:mr-4 file:rounded-xl file:border-0 file:bg-navy/[0.07] file:px-4 file:py-2 file:text-[14px] file:font-semibold file:text-navy hover:file:bg-navy/[0.12]"
        />
        <SubmitButton variant="secondary" size="sm" pendingLabel="Uploading" className="shrink-0">
          Upload
        </SubmitButton>
      </div>
      <p className="text-[12px] text-navy/70">{hint}</p>
      {state.status !== "idle" && <FormMessage state={state} />}
    </form>
  );
}
