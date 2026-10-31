"use client";

import { chooseDeliverToAction } from "@/app/(store)/actions";
import { NIGERIAN_STATES } from "@/data/nigeria-states";

export function DeliverToPicker({ value, id }: { value: string; id: string }) {
  return (
    <form action={chooseDeliverToAction} className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold text-navy">
        Deliver to
      </label>
      <select
        key={value}
        id={id}
        name="deliverTo"
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-11 rounded-xl border border-navy/20 bg-white px-3 text-[16px] text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
      >
        <option value="">Choose your state</option>
        {NIGERIAN_STATES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {!value && <span className="text-[13px] text-navy/70">to see delivered prices</span>}
    </form>
  );
}
