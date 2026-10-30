import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { homePathFor, requireUser, signUpRoleFrom } from "@/server/auth/dal";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set up your account",
  robots: { index: false },
};

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const role = signUpRoleFrom((await searchParams).as);
  const user = await requireUser();
  if (user.role) {
    redirect(homePathFor(user));
  }

  return (
    <>
      <h1 className="font-display text-[clamp(40px,5vw,60px)] uppercase leading-[0.92] text-navy">Set up your account</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-navy/70">
        Signed in as <span className="font-semibold text-navy">{user.email}</span>. Tell us a little about you to finish.
      </p>
      <div className="mt-8">
        <OnboardingForm defaultRole={role} />
      </div>
    </>
  );
}
