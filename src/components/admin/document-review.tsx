"use client";

import { useActionState, useId, useState } from "react";
import { FormMessage } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button-classes";
import { initialFormState, type FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function DocumentReview({ action, documentId, status }: { action: Action; documentId: string; status: string }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [rejecting, setRejecting] = useState(false);
  const reasonId = useId();

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="documentId" value={documentId} />
      {state.status !== "idle" && <FormMessage state={state} />}
      {rejecting && (
        <div className="grid gap-2">
          <label htmlFor={reasonId} className="text-[13px] font-semibold text-navy">
            Reason for rejection
          </label>
          <textarea
            id={reasonId}
            name="note"
            rows={2}
            maxLength={1000}
            required
            className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[14px] text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && !rejecting && (
          <button type="submit" name="decision" value="approve" disabled={pending} className={buttonClasses("secondary", "sm")}>
            Approve
          </button>
        )}
        {rejecting ? (
          <>
            <button type="submit" name="decision" value="reject" disabled={pending} className={buttonClasses("danger", "sm")}>
              Confirm rejection
            </button>
            <button type="button" onClick={() => setRejecting(false)} className={buttonClasses("ghost", "sm")}>
              Cancel
            </button>
          </>
        ) : (
          status !== "rejected" && (
            <button type="button" onClick={() => setRejecting(true)} className={buttonClasses("outline", "sm")}>
              Reject
            </button>
          )
        )}
      </div>
    </form>
  );
}
