"use client";

import { useActionState } from "react";
import { submitTruckForReviewAction, uploadTruckDocumentAction, uploadTruckPhotoAction } from "@/app/vendor/trucks/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";

const FILE_INPUT =
  "block w-full text-[14px] text-navy file:mr-4 file:rounded-full file:border-0 file:bg-navy/[0.07] file:px-4 file:py-2 file:text-[14px] file:font-semibold file:text-navy hover:file:bg-navy/[0.12]";

export function TruckDocumentUpload({ truckId, type, label, expires }: { truckId: string; type: string; label: string; expires: boolean }) {
  const [state, action] = useActionState(uploadTruckDocumentAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const prefix = `${type}-${truckId}`;

  return (
    <form action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="truckId" value={truckId} />
      <input type="hidden" name="type" value={type} />
      {expires && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={`${prefix}-issue`} label="Issue date" errors={errors.issueDate}>
            <TextInput id={`${prefix}-issue`} name="issueDate" type="date" errors={errors.issueDate} />
          </Field>
          <Field id={`${prefix}-expiry`} label="Expiry date" required errors={errors.expiryDate}>
            <TextInput id={`${prefix}-expiry`} name="expiryDate" type="date" errors={errors.expiryDate} />
          </Field>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor={`${prefix}-file`} className="sr-only">
          Upload {label}
        </label>
        <input
          id={`${prefix}-file`}
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
          aria-invalid={errors.file?.length ? true : undefined}
          className={FILE_INPUT}
        />
        <SubmitButton variant="secondary" size="sm" pendingLabel="Uploading" className="shrink-0">
          Upload
        </SubmitButton>
      </div>
      <p className="text-[12px] text-navy/70">PDF, JPG, PNG or WebP, up to 10 MB.</p>
      {state.status !== "idle" && <FormMessage state={state} />}
    </form>
  );
}

export function TruckPhotoUpload({ truckId }: { truckId: string }) {
  const [state, action] = useActionState(uploadTruckPhotoAction, initialFormState);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="truckId" value={truckId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor={`photo-${truckId}`} className="sr-only">
          Add a truck photo
        </label>
        <input id={`photo-${truckId}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" required className={FILE_INPUT} />
        <SubmitButton variant="secondary" size="sm" pendingLabel="Uploading" className="shrink-0">
          Add photo
        </SubmitButton>
      </div>
      <p className="text-[12px] text-navy/70">Front, side and rear views in daylight. JPG, PNG or WebP, up to 10 MB.</p>
      {state.status !== "idle" && <FormMessage state={state} />}
    </form>
  );
}

export function SubmitTruckForm({ truckId, ready }: { truckId: string; ready: boolean }) {
  const [state, action] = useActionState(submitTruckForReviewAction.bind(null, truckId), initialFormState);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <SubmitButton size="lg" disabled={!ready} pendingLabel="Submitting">
        Submit truck for review
      </SubmitButton>
    </form>
  );
}
