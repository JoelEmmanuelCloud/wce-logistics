import type { Locator } from "@playwright/test";

export async function pickOption(trigger: Locator, choice: string | { label: string }) {
  await trigger.click();
  const page = trigger.page();
  const option = typeof choice === "string" ? page.locator(`[role="option"][data-value="${choice}"]`) : page.getByRole("option", { name: choice.label, exact: true });
  await option.click();
}
