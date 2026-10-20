"use client";

import { useActionState, useId, useState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button-classes";
import { initialFormState, type FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ReasonActionForm({
  action,
  trigger,
  confirmLabel,
  reasonLabel,
  variant = "danger",
  triggerVariant = "outline",
}: {
  action: Action;
  trigger: string;
  confirmLabel: string;
  reasonLabel: string;
  variant?: ButtonVariant;
  triggerVariant?: ButtonVariant;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [open, setOpen] = useState(false);
  const reasonId = useId();

  if (!open) {
    return (
      <div className="grid gap-3">
        {state.status !== "idle" && <FormMessage state={state} />}
        <button type="button" onClick={() => setOpen(true)} className={buttonClasses(triggerVariant, "md")}>
          {trigger}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      <FormMessage state={state} />
      <label htmlFor={reasonId} className="text-[14px] font-semibold text-navy">
        {reasonLabel}
      </label>
      <textarea
        id={reasonId}
        name="reason"
        rows={3}
        maxLength={500}
        required
        aria-invalid={state.fieldErrors?.reason ? true : undefined}
        className="w-full rounded-xl border border-navy/20 bg-white px-4 py-3 text-[15px] text-navy focus:border-orange-ink focus:outline-none focus:ring-3 focus:ring-orange/25"
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonClasses(variant, "md")}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClasses("ghost", "md")}>
          Back
        </button>
      </div>
    </form>
  );
}
