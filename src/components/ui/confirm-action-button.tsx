"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button-classes";
import { initialFormState, type FormState } from "@/lib/form-state";

export function ConfirmActionButton({
  action,
  trigger,
  question,
  confirmLabel,
  pendingLabel,
  variant = "primary",
}: {
  action: (state: FormState) => Promise<FormState>;
  trigger: string;
  question: string;
  confirmLabel: string;
  pendingLabel: string;
  variant?: ButtonVariant;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="grid gap-3">
        {state.status !== "idle" && <FormMessage state={state} />}
        <button type="button" onClick={() => setOpen(true)} className={buttonClasses(variant, "md")}>
          {trigger}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      <FormMessage state={state} />
      <p className="text-[14px] font-semibold text-navy">{question}</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant={variant} pendingLabel={pendingLabel}>
          {confirmLabel}
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={buttonClasses("ghost", "md")}>
          Back
        </button>
      </div>
    </form>
  );
}
