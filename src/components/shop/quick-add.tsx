"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/lib/form-state";

export function QuickAdd({ action, quantity, label }: { action: (state: FormState, formData: FormData) => Promise<FormState>; quantity: number; label: string }) {
  const [state, formAction] = useActionState(action, initialFormState);

  if (state.status === "success") {
    return (
      <Link href="/cart" className="flex h-11 items-center justify-center rounded-xl bg-navy text-[15px] font-semibold text-white transition-colors hover:bg-[#13335c]">
        Added. View cart
      </Link>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="quantity" value={quantity} />
      <SubmitButton pendingLabel="Adding" aria-label={label}>
        Add to cart
      </SubmitButton>
      {state.status === "error" && (
        <p role="alert" className="text-[13px] font-medium leading-snug text-[#B42318]">
          {state.message}
        </p>
      )}
    </form>
  );
}
