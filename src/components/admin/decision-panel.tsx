"use client";

import { useActionState, useId } from "react";
import { FormMessage } from "@/components/ui/alert";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button-classes";
import { initialFormState, type FormState } from "@/lib/form-state";

type Option = { value: string; label: string; variant: ButtonVariant };
type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function DecisionPanel({
  action,
  options,
  noteLabel = "Note to the vendor",
  noteHint = "Required when requesting information, declining or suspending. The vendor will see this note.",
  hiddenFields,
}: {
  action: Action;
  options: readonly Option[];
  noteLabel?: string;
  noteHint?: string;
  hiddenFields?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const noteId = useId();
  const errors = state.fieldErrors?.note;

  return (
    <form action={formAction} className="grid gap-4">
      {hiddenFields && Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <FormMessage state={state} />
      <div className="grid gap-2">
        <label htmlFor={noteId} className="text-[14px] font-semibold text-navy">
          {noteLabel}
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={3}
          maxLength={1000}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={`${noteId}-hint`}
          className="w-full rounded-xl border border-navy/20 bg-white px-4 py-3 text-[15px] text-navy focus:border-orange-ink focus:outline-none focus:ring-3 focus:ring-orange/25 aria-[invalid=true]:border-[#B42318]"
        />
        <p id={`${noteId}-hint`} className="text-[13px] text-navy/70">
          {noteHint}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="submit"
            name="decision"
            value={option.value}
            disabled={pending}
            className={buttonClasses(option.variant, "md")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </form>
  );
}
