"use client";

import { useActionState, useEffect, useState } from "react";
import { requestCodeAction, verifyCodeAction, type SignInState } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";

const initial: SignInState = { status: "idle", step: "email" };

export function SignInForm() {
  const [requestState, requestAction] = useActionState(requestCodeAction, initial);
  const [verifyState, verifyAction] = useActionState(verifyCodeAction, initial);
  const [editingEmail, setEditingEmail] = useState(false);
  const [seenRequestState, setSeenRequestState] = useState(requestState);
  const [now, setNow] = useState(0);

  if (seenRequestState !== requestState) {
    setSeenRequestState(requestState);
    setEditingEmail(false);
  }

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, []);

  const onCodeStep = requestState.step === "code" && Boolean(requestState.email) && !editingEmail;
  const secondsLeft = requestState.resendAt && now > 0 ? Math.max(0, Math.ceil((requestState.resendAt - now) / 1000)) : 0;

  if (!onCodeStep) {
    return (
      <form action={requestAction} className="grid gap-5" noValidate>
        <FormMessage state={requestState.step === "email" ? requestState : { status: "idle" }} />
        <Field id="email" label="Email address" required hint="We will email you a one-time code." errors={requestState.fieldErrors?.email}>
          <TextInput
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="ada@company.ng"
            defaultValue={requestState.email ?? ""}
            required
            hasHint
            errors={requestState.fieldErrors?.email}
          />
        </Field>
        <SubmitButton size="lg" pendingLabel="Sending code">
          Continue
        </SubmitButton>
      </form>
    );
  }

  const state = verifyState.status === "idle" ? requestState : verifyState;

  return (
    <div className="grid gap-5">
      <form action={verifyAction} className="grid gap-5" noValidate>
        <FormMessage state={state} />
        <input type="hidden" name="email" value={requestState.email} />
        <Field id="code" label="Verification code" required errors={verifyState.fieldErrors?.code}>
          <TextInput
            id="code"
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            required
            errors={verifyState.fieldErrors?.code}
            className="text-center text-[22px] font-semibold tracking-[0.5em]"
          />
        </Field>
        <SubmitButton size="lg" pendingLabel="Verifying">
          Verify and continue
        </SubmitButton>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
        <button type="button" onClick={() => setEditingEmail(true)} className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
          Use a different email
        </button>
        <form action={requestAction}>
          <input type="hidden" name="email" value={requestState.email} />
          <button
            type="submit"
            disabled={secondsLeft > 0}
            className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4 disabled:text-navy/70 disabled:no-underline"
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
        </form>
      </div>
    </div>
  );
}
