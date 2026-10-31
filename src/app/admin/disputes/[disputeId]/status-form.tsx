"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextArea } from "@/components/ui/field";
import { fieldsKey, initialFormState, type FormState } from "@/lib/form-state";

const OPTIONS = [
  { value: "under_review", label: "Under review" },
  { value: "awaiting_information", label: "Awaiting information from a party" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed without action" },
];

export function DisputeStatusForm({ action, current }: { action: (state: FormState, formData: FormData) => Promise<FormState>; current: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [status, setStatus] = useState(current === "open" ? "under_review" : current);
  const closing = status === "resolved" || status === "closed";
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-5">
        <Field id="status" label="Status" required errors={errors.status}>
          <SelectInput id="status" value={status} onValueChange={setStatus} errors={errors.status}>
            {OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {closing && (
          <Field id="resolution" label="Outcome" required hint="Shared with both parties. Include any refund or payout decision." errors={errors.resolution}>
            <TextArea id="resolution" rows={4} maxLength={2000} hasHint errors={errors.resolution} />
          </Field>
        )}
      </div>
      <SubmitButton variant={closing ? "primary" : "secondary"} pendingLabel="Saving">
        {closing ? "Close dispute" : "Update status"}
      </SubmitButton>
    </form>
  );
}
