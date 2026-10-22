"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import type { ButtonVariant } from "@/components/ui/button-classes";
import { initialFormState, type FormState } from "@/lib/form-state";

export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = "primary",
}: {
  action: (state: FormState) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  variant?: ButtonVariant;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="grid gap-3">
      {state.status !== "idle" && <FormMessage state={state} />}
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
    </form>
  );
}
