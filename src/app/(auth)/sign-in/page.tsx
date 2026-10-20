import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/server/auth/dal";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to WCE Logistics with your mobile number.",
  robots: { index: false },
};

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(homePathFor(user));
  }

  return (
    <>
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-ink">Sign in or create an account</p>
      <h1 className="mt-3 font-display text-[clamp(40px,5vw,60px)] uppercase leading-[0.92] text-navy">Welcome to WCE Logistics</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-navy/70">
        Use your mobile number. New here? We will set up your account after you verify your number.
      </p>
      <div className="mt-8">
        <SignInForm />
      </div>
      <p className="mt-8 text-[13px] leading-relaxed text-navy/70">
        By continuing you agree to receive a one-time SMS code. Standard network rates may apply.
      </p>
    </>
  );
}
