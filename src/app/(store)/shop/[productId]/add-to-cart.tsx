"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/form-state";

export function AddToCartForm({
  action,
  minUnits,
  maxUnits,
  unitWeightKg,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  minUnits: number;
  maxUnits: number;
  unitWeightKg: number;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [quantity, setQuantity] = useState(String(minUnits));
  const units = Number(quantity);
  const weight = Number.isInteger(units) && units > 0 ? units * unitWeightKg : 0;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status !== "idle" && <FormMessage state={state} />}
      <Field id="quantity" label="Quantity" required hint={`Minimum ${minUnits.toLocaleString("en-NG")}, up to ${maxUnits.toLocaleString("en-NG")}. Total weight ${weight.toLocaleString("en-NG")} kg.`}>
        <TextInput id="quantity" type="number" inputMode="numeric" min={minUnits} max={maxUnits} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} hasHint />
      </Field>
      <SubmitButton size="lg" pendingLabel="Adding">
        Add to cart
      </SubmitButton>
      {state.status === "success" && (
        <Link href="/cart" className="text-center font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
          View cart and check out
        </Link>
      )}
    </form>
  );
}
