import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser, homePathFor, signUpRoleFrom } from "@/server/auth/dal";
import { AuthFormSkeleton } from "../form-skeleton";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to WCE Logistics with your email address.",
  robots: { index: false },
};

async function SignInGate({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const role = signUpRoleFrom((await searchParams).as);
  const user = await getCurrentUser();
  if (user) {
    redirect(homePathFor(user));
  }
  return <SignInForm role={role} />;
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <>
      <h1 className="font-display text-[clamp(40px,5vw,60px)] uppercase leading-[0.92] text-navy">Welcome to WCE Logistics</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-navy/70">
        Use your email address. New here? We will set up your account after you verify it.
      </p>
      <div className="mt-8">
        <Suspense fallback={<AuthFormSkeleton fields={1} />}>
          <SignInGate searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-8 text-[13px] leading-relaxed text-navy/70">
        We only use your email to sign you in and to send booking updates.
      </p>
    </>
  );
}
