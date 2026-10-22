"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf, type FormState } from "@/lib/form-state";
import { Stars } from "./star-rating";

const LABELS = ["Very poor", "Poor", "Okay", "Good", "Excellent"];

export function ReviewForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-5">
        <fieldset className="grid gap-2" aria-describedby={errors.rating?.length ? "rating-error" : undefined}>
          <legend className="mb-1 text-[14px] font-semibold text-navy">
            Your rating<span className="text-orange-ink" aria-hidden="true"> *</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-5">
            {LABELS.map((label, index) => (
              <label
                key={label}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-navy/15 bg-white px-2 py-3 text-[13px] text-navy transition-colors has-checked:border-orange-ink has-checked:bg-orange/[0.08] has-focus-visible:ring-3 has-focus-visible:ring-orange/25"
              >
                <input type="radio" name="rating" value={index + 1} defaultChecked={valueOf(state.values, "rating", "") === String(index + 1)} className="sr-only" />
                <Stars value={index + 1} className="size-3.5" />
                <span className="font-semibold">
                  {index + 1} <span className="sr-only">out of 5,</span> {label}
                </span>
              </label>
            ))}
          </div>
          {errors.rating?.length ? (
            <p id="rating-error" role="alert" className="text-[13px] font-medium text-[#B42318]">
              {errors.rating[0]}
            </p>
          ) : null}
        </fieldset>
        <Field id="comment" label="Comments" hint="Shown to the vendor and future shippers." errors={errors.comment}>
          <TextArea id="comment" rows={3} maxLength={1000} defaultValue={valueOf(state.values, "comment", "")} hasHint errors={errors.comment} />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Sending">
        Submit review
      </SubmitButton>
    </form>
  );
}
