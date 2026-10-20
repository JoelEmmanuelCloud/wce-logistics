"use client";

import { useActionState } from "react";
import { submitVendorForReviewAction } from "@/app/vendor/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";

export function SubmitReviewForm({ ready }: { ready: boolean }) {
  const [state, action] = useActionState(submitVendorForReviewAction, initialFormState);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <SubmitButton size="lg" disabled={!ready} pendingLabel="Submitting">
        Submit for verification
      </SubmitButton>
    </form>
  );
}
