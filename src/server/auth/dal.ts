import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User, UserRole } from "@/server/db/schema";
import { readSessionUser } from "@/server/auth/session";

export const getCurrentUser = cache(async (): Promise<User | null> => readSessionUser());

export function homePathFor(user: Pick<User, "role">): string {
  switch (user.role) {
    case "admin":
      return "/admin";
    case "vendor":
      return "/vendor";
    case "customer":
      return "/account";
    case "driver":
      return "/driver";
    default:
      return "/onboarding";
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<User> {
  const user = await requireUser();
  if (!user.role || !roles.includes(user.role)) {
    redirect(homePathFor(user));
  }
  return user;
}
