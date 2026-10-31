"use client";

import { useOptimistic, useTransition } from "react";
import { chooseDeliverToAction } from "@/app/(store)/actions";
import { Select } from "@/components/ui/select";
import { NIGERIAN_STATES } from "@/data/nigeria-states";

const OPTIONS = [{ value: "", label: "All states" }, ...NIGERIAN_STATES.map((name) => ({ value: name, label: name }))];

export function DeliverToPicker({ value, id }: { value: string; id: string }) {
  const [shown, setShown] = useOptimistic(value);
  const [, startTransition] = useTransition();

  function choose(state: string) {
    const formData = new FormData();
    formData.set("deliverTo", state);
    startTransition(async () => {
      setShown(state);
      await chooseDeliverToAction(formData);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold text-navy">
        Deliver to
      </label>
      <div className="w-56">
        <Select id={id} options={OPTIONS} value={shown} onValueChange={choose} placeholder="Choose your state" label="Deliver to" className="h-11" />
      </div>
      {!value && <span className="text-[13px] text-navy/70">to see delivered prices</span>}
    </div>
  );
}
