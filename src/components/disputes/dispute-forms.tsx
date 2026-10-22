"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextArea } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf, type FormState } from "@/lib/form-state";
import { DISPUTE_CATEGORIES } from "@/lib/labels";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function AttachmentField({ errors }: { errors?: string[] }) {
  return (
    <Field id="attachment" label="Evidence" hint="Photo or document: PDF, JPG, PNG or WebP, up to 10 MB." errors={errors}>
      <input
        id="attachment"
        name="attachment"
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        aria-describedby={errors?.length ? "attachment-error" : "attachment-hint"}
        className="block w-full text-[14px] text-navy file:mr-4 file:rounded-full file:border-0 file:bg-navy/[0.07] file:px-4 file:py-2 file:text-[14px] file:font-semibold file:text-navy hover:file:bg-navy/[0.12]"
      />
    </Field>
  );
}

export function OpenDisputeForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  const value = (key: string) => valueOf(state.values, key, "");

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-5">
        <Field id="category" label="What went wrong?" required errors={errors.category}>
          <SelectInput id="category" defaultValue={value("category")} errors={errors.category}>
            <option value="" disabled>
              Choose one
            </option>
            {DISPUTE_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field id="description" label="Describe the problem" required hint="Include what you expected, what happened and any amounts involved." errors={errors.description}>
          <TextArea id="description" rows={5} maxLength={2000} defaultValue={value("description")} hasHint errors={errors.description} />
        </Field>
        <AttachmentField errors={errors.attachment} />
      </div>
      <SubmitButton variant="danger" pendingLabel="Sending">
        Open dispute
      </SubmitButton>
    </form>
  );
}

export function DisputeReplyForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-5">
        <Field id="body" label="Your message" required errors={errors.body}>
          <TextArea id="body" rows={4} maxLength={2000} defaultValue={state.status === "error" ? valueOf(state.values, "body", "") : ""} errors={errors.body} />
        </Field>
        <AttachmentField errors={errors.attachment} />
      </div>
      <SubmitButton variant="secondary" pendingLabel="Sending">
        Send message
      </SubmitButton>
    </form>
  );
}
