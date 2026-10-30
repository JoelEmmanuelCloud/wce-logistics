"use client";

import { useActionState, useState } from "react";
import { createRouteAction } from "@/app/vendor/routes/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { NIGERIAN_STATES } from "@/data/nigeria-states";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";

export type RouteTruckOption = { id: string; label: string; payloadKg: number; baseState: string; baseCity: string };

function StateSelect({ id, value, errors }: { id: string; value: string; errors?: string[] }) {
  return (
    <SelectInput id={id} defaultValue={value} errors={errors}>
      <option value="" disabled>
        Choose a state
      </option>
      {NIGERIAN_STATES.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </SelectInput>
  );
}

export function RouteForm({ trucks, minDate, maxDate }: { trucks: RouteTruckOption[]; minDate: string; maxDate: string }) {
  const [state, action] = useActionState(createRouteAction, initialFormState);
  const [truckId, setTruckId] = useState(trucks[0]?.id ?? "");
  const truck = trucks.find((option) => option.id === truckId) ?? trucks[0];
  const errors = state.fieldErrors ?? {};
  const value = (key: string, fallback = "") => valueOf(state.values, key, fallback);

  return (
    <form action={action} className="grid gap-8" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Field id="truckId" label="Truck" required errors={errors.truckId}>
            <SelectInput id="truckId" defaultValue={value("truckId", truck?.id)} onChange={(event) => setTruckId(event.target.value)} errors={errors.truckId}>
              {trucks.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="departureDate" label="Departure date" required errors={errors.departureDate}>
            <TextInput id="departureDate" type="date" min={minDate} max={maxDate} defaultValue={value("departureDate")} errors={errors.departureDate} />
          </Field>
        </div>

        <fieldset className="grid gap-4">
          <legend className="text-[14px] font-semibold text-navy">From</legend>
          <div className="grid gap-6 md:grid-cols-2">
            <Field id="originState" label="State" required errors={errors.originState}>
              <StateSelect key={truck?.id} id="originState" value={value("originState", truck?.baseState)} errors={errors.originState} />
            </Field>
            <Field id="originCity" label="Town or city" required errors={errors.originCity}>
              <TextInput key={truck?.id} id="originCity" defaultValue={value("originCity", truck?.baseCity)} errors={errors.originCity} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="text-[14px] font-semibold text-navy">To</legend>
          <div className="grid gap-6 md:grid-cols-2">
            <Field id="destinationState" label="State" required errors={errors.destinationState}>
              <StateSelect id="destinationState" value={value("destinationState")} errors={errors.destinationState} />
            </Field>
            <Field id="destinationCity" label="Town or city" required errors={errors.destinationCity}>
              <TextInput id="destinationCity" defaultValue={value("destinationCity")} errors={errors.destinationCity} />
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-6 md:grid-cols-2">
          <Field
            id="capacityKg"
            label="Capacity offered (kg)"
            required
            hint={truck ? `Up to ${truck.payloadKg.toLocaleString("en-NG")} kg for this truck.` : undefined}
            errors={errors.capacityKg}
          >
            <TextInput key={truck?.id} id="capacityKg" inputMode="numeric" defaultValue={value("capacityKg", truck ? String(truck.payloadKg) : "")} hasHint errors={errors.capacityKg} />
          </Field>
          <Field id="transitHours" label="Estimated transit time (hours)" required errors={errors.transitHours}>
            <TextInput id="transitHours" inputMode="numeric" defaultValue={value("transitHours")} errors={errors.transitHours} />
          </Field>
        </div>

        <fieldset className="grid gap-4">
          <legend className="text-[14px] font-semibold text-navy">Pricing in naira</legend>
          <label className="flex items-center gap-3 text-[15px] text-navy">
            <input
              type="checkbox"
              name="allowsShared"
              defaultChecked={state.values ? state.values.allowsShared === "on" : true}
              className="size-4 accent-[#B84A00]"
            />
            Accept shared loads from several shippers
          </label>
          <div className="grid gap-6 md:grid-cols-3">
            <Field id="ratePerTonneKobo" label="Rate per tonne" required hint="Charged on the shipment weight. ₦80,000 per tonne is ₦80 per kg." errors={errors.ratePerTonneKobo}>
              <TextInput id="ratePerTonneKobo" inputMode="decimal" placeholder="80000" defaultValue={value("ratePerTonneKobo")} hasHint errors={errors.ratePerTonneKobo} />
            </Field>
            <Field id="minimumChargeKobo" label="Minimum charge" hint="Smallest amount for any shared load." errors={errors.minimumChargeKobo}>
              <TextInput id="minimumChargeKobo" inputMode="decimal" placeholder="5000" defaultValue={value("minimumChargeKobo")} hasHint errors={errors.minimumChargeKobo} />
            </Field>
            <Field id="dedicatedPriceKobo" label="Whole-truck price" hint="Leave empty to offer shared loads only." errors={errors.dedicatedPriceKobo}>
              <TextInput id="dedicatedPriceKobo" inputMode="decimal" placeholder="450000" defaultValue={value("dedicatedPriceKobo")} hasHint errors={errors.dedicatedPriceKobo} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="text-[14px] font-semibold text-navy">Extra charges per booking</legend>
          <p className="-mt-2 text-[13px] leading-snug text-navy/70">
            Added to every booking on this trip and shown to the shipper as separate lines. Leave them empty if they are already in your rate.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <Field id="loadingChargeKobo" label="Loading" errors={errors.loadingChargeKobo}>
              <TextInput id="loadingChargeKobo" inputMode="decimal" placeholder="3000" defaultValue={value("loadingChargeKobo")} errors={errors.loadingChargeKobo} />
            </Field>
            <Field id="offloadingChargeKobo" label="Offloading" errors={errors.offloadingChargeKobo}>
              <TextInput id="offloadingChargeKobo" inputMode="decimal" placeholder="3000" defaultValue={value("offloadingChargeKobo")} errors={errors.offloadingChargeKobo} />
            </Field>
            <Field id="tollChargeKobo" label="Tolls" errors={errors.tollChargeKobo}>
              <TextInput id="tollChargeKobo" inputMode="decimal" placeholder="2000" defaultValue={value("tollChargeKobo")} errors={errors.tollChargeKobo} />
            </Field>
          </div>
        </fieldset>
      </div>

      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Publishing">
          Publish trip
        </SubmitButton>
      </div>
    </form>
  );
}
