"use client";

import { useActionState, useId } from "react";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/lib/form-state";

export function CartQuantityForm({ action, quantity, label }: { action: (state: FormState, formData: FormData) => Promise<FormState>; quantity: number; label: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const id = useId();
  return (
    <form action={formAction} className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name="quantity"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        defaultValue={quantity}
        className="h-11 w-24 rounded-xl border border-navy/20 bg-white px-3 text-[16px] text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
      />
      <SubmitButton variant="outline" pendingLabel="Saving">
        Update
      </SubmitButton>
      {state.status === "error" && <span className="text-[13px] font-medium text-[#B42318]">{state.message}</span>}
    </form>
  );
}
