"use client";

import { useActionState, useState } from "react";
import { setRouteStatusAction } from "@/app/vendor/routes/actions";
import { buttonClasses } from "@/components/ui/button-classes";
import { initialFormState } from "@/lib/form-state";

export function RouteStatusForm({ routeId, status }: { routeId: string; status: string }) {
  const [state, action, pending] = useActionState(setRouteStatusAction, initialFormState);
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="routeId" value={routeId} />
      <div className="flex flex-wrap gap-2">
        {status === "active" && (
          <button type="submit" name="status" value="paused" disabled={pending} className={buttonClasses("outline", "sm")}>
            Pause
          </button>
        )}
        {status === "paused" && (
          <button type="submit" name="status" value="active" disabled={pending} className={buttonClasses("secondary", "sm")}>
            Resume
          </button>
        )}
        {confirming ? (
          <>
            <button type="submit" name="status" value="cancelled" disabled={pending} className={buttonClasses("danger", "sm")}>
              Confirm cancellation
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={buttonClasses("ghost", "sm")}>
              Keep trip
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={buttonClasses("ghost", "sm", "text-[#912018]")}>
            Cancel trip
          </button>
        )}
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-[13px] font-medium text-[#912018]">
          {state.message}
        </p>
      )}
    </form>
  );
}
