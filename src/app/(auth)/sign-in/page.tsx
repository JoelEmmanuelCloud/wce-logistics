import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor, signUpRoleFrom } from "@/server/auth/dal";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to WCE Logistics with your email address.",
  robots: { index: false },
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const role = signUpRoleFrom((await searchParams).as);
  const user = await getCurrentUser();
  if (user) {
    redirect(homePathFor(user));
  }

  return (
    <>
      <h1 className="font-display text-[clamp(40px,5vw,60px)] uppercase leading-[0.92] text-navy">Welcome to WCE Logistics</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-navy/70">
        Use your email address. New here? We will set up your account after you verify it.
      </p>
      <div className="mt-8">
        <SignInForm role={role} />
      </div>
      <p className="mt-8 text-[13px] leading-relaxed text-navy/70">
        We only use your email to sign you in and to send booking updates.
      </p>
    </>
  );
}
