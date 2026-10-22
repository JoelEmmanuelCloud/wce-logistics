"use client";

import { useActionState } from "react";
import { savePayoutAccountAction } from "@/app/vendor/payouts/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { fieldsKey, initialFormState, valueOf } from "@/lib/form-state";

export function PayoutAccountForm({ banks, defaultBankCode }: { banks: Array<{ name: string; code: string }>; defaultBankCode: string }) {
  const [state, action] = useActionState(savePayoutAccountAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} />
      <div key={fieldsKey(state)} className="grid gap-6 md:grid-cols-2">
        <Field id="bankCode" label="Bank" required errors={errors.bankCode}>
          <SelectInput id="bankCode" defaultValue={valueOf(state.values, "bankCode", defaultBankCode)} errors={errors.bankCode}>
            <option value="" disabled>
              Choose your bank
            </option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field id="accountNumber" label="Account number" required hint="Your 10-digit NUBAN number. We confirm the account name with your bank." errors={errors.accountNumber}>
          <TextInput
            id="accountNumber"
            inputMode="numeric"
            autoComplete="off"
            maxLength={13}
            defaultValue={valueOf(state.values, "accountNumber", "")}
            hasHint
            errors={errors.accountNumber}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Verifying account">
          Verify and save
        </SubmitButton>
      </div>
    </form>
  );
}
