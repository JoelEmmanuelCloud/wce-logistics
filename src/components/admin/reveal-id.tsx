"use client";

import { useState, useTransition } from "react";
import { revealVendorIdReferenceAction } from "@/app/admin/actions";

export function RevealId({ vendorId, last4 }: { vendorId: string; last4: string | null }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!last4) {
    return <span className="text-navy/50">Not provided</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <span className="font-mono tracking-wider">{value ?? `•••••••${last4}`}</span>
      {!value && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await revealVendorIdReferenceAction(vendorId);
              if ("value" in result) {
                setValue(result.value);
                setError(null);
              } else {
                setError(result.error);
              }
            })
          }
          className="text-[13px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4 disabled:text-navy/50"
        >
          {pending ? "Revealing" : "Reveal (logged)"}
        </button>
      )}
      {error && <span className="text-[13px] text-[#912018]">{error}</span>}
    </span>
  );
}
