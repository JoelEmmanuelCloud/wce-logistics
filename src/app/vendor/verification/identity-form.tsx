"use client";

import { useActionState } from "react";
import { saveIdentityAction } from "@/app/vendor/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";
import { ID_DOCUMENT_TYPES } from "@/lib/labels";

export function IdentityForm({ defaultType, savedLast4, editable }: { defaultType: string; savedLast4: string | null; editable: boolean }) {
  const [state, action] = useActionState(saveIdentityAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <fieldset key={fieldsKey(state)} disabled={!editable} className="grid gap-5 md:grid-cols-2">
        <Field id="idDocumentType" label="ID type" required errors={errors.idDocumentType}>
          <SelectInput id="idDocumentType" defaultValue={valueOf(state.values, "idDocumentType", defaultType)} errors={errors.idDocumentType}>
            <option value="" disabled>
              Choose an ID type
            </option>
            {ID_DOCUMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field
          id="idDocumentReference"
          label="ID number"
          required
          hint={savedLast4 ? `Saved number ends in ${savedLast4}. Enter it again only to change it.` : "Stored encrypted. Only our verification team can see it."}
          errors={errors.idDocumentReference}
        >
          <TextInput id="idDocumentReference" autoComplete="off" spellCheck={false} hasHint errors={errors.idDocumentReference} />
        </Field>
      </fieldset>
      {editable && (
        <div className="flex justify-end">
          <SubmitButton variant="secondary" pendingLabel="Saving">
            Save identity details
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
