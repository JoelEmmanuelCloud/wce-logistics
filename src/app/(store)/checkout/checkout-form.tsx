"use client";

import { useActionState, useState } from "react";
import { placeOrderAction } from "@/app/(store)/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";
import { formatKg } from "@/lib/labels";
import { formatNaira } from "@/lib/pricing";
import { orderTotals } from "@/lib/shop";

type Line = { id: string; title: string; unitLabel: string; unitPriceKobo: number; unitWeightKg: number; quantity: number };
type Rate = { state: string; ratePerTonneKobo: number; minimumChargeKobo: number };

export function CheckoutForm({ sellerName, origin, lines, rates }: { sellerName: string; origin: string; lines: Line[]; rates: Rate[] }) {
  const [state, action] = useActionState(placeOrderAction, initialFormState);
  const [destination, setDestination] = useState(valueOf(state.values, "destinationState", ""));
  const errors = state.fieldErrors ?? {};
  const value = (key: string) => valueOf(state.values, key, "");
  const rate = rates.find((option) => option.state === destination) ?? null;
  const totals = orderTotals(lines, rate);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" noValidate>
      <div className="grid content-start gap-5 rounded-2xl bg-white p-[clamp(20px,2.4vw,32px)]">
        <h2 className="text-[19px] font-semibold text-navy">Where should it go?</h2>
        <FormMessage state={state} />
        <div key={fieldsKey(state)} className="grid gap-5">
          <Field id="destinationState" label="Delivery state" required hint={`${sellerName} delivers to ${rates.length} state${rates.length === 1 ? "" : "s"}.`} errors={errors.destinationState}>
            <SelectInput id="destinationState" value={destination} onChange={(event) => setDestination(event.target.value)} hasHint errors={errors.destinationState}>
              <option value="" disabled>
                Choose a state
              </option>
              {rates.map((option) => (
                <option key={option.state} value={option.state}>
                  {option.state}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="destinationCity" label="Town or city" required errors={errors.destinationCity}>
            <TextInput id="destinationCity" autoComplete="address-level2" defaultValue={value("destinationCity")} errors={errors.destinationCity} />
          </Field>
          <Field id="destinationAddress" label="Delivery address" required errors={errors.destinationAddress}>
            <TextInput id="destinationAddress" autoComplete="street-address" defaultValue={value("destinationAddress")} errors={errors.destinationAddress} />
          </Field>
          <Field id="deliveryNotes" label="Delivery notes" hint="Gate instructions, offloading help or a contact on site." errors={errors.deliveryNotes}>
            <TextArea id="deliveryNotes" rows={3} defaultValue={value("deliveryNotes")} hasHint errors={errors.deliveryNotes} />
          </Field>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl bg-white p-5">
          <h2 className="text-[19px] font-semibold text-navy">Your order</h2>
          <p className="mt-1 text-[14px] text-navy/70">
            From {sellerName}, {origin}
          </p>
          <ul className="mt-4 grid gap-3">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4 text-[15px]">
                <span className="text-navy">
                  {line.quantity.toLocaleString("en-NG")} x {line.title}
                </span>
                <span className="shrink-0 tabular-nums text-navy">{formatNaira(line.unitPriceKobo * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid gap-2 border-t border-navy/10 pt-4 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-navy/70">Goods</dt>
              <dd className="tabular-nums text-navy">{formatNaira(totals.goodsKobo)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy/70">Delivery, {formatKg(totals.weightKg)}</dt>
              <dd className="tabular-nums text-navy">{rate ? formatNaira(totals.deliveryKobo) : "Choose a state"}</dd>
            </div>
            <div className="flex justify-between gap-4 text-[18px] font-semibold">
              <dt className="text-navy">Total</dt>
              <dd className="tabular-nums text-navy">{formatNaira(totals.totalKobo)}</dd>
            </div>
          </dl>
          <SubmitButton size="lg" pendingLabel="Placing order" className="mt-5 w-full" disabled={!rate}>
            Place order
          </SubmitButton>
          <p className="mt-3 text-[13px] leading-relaxed text-navy/70">You pay nothing yet. The seller confirms stock and schedules a truck, then you pay online.</p>
        </div>
      </aside>
    </form>
  );
}
