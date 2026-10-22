import { EmptyState, PageHeader } from "@/components/ui/card";

export function InactiveDriverNotice() {
  return (
    <>
      <PageHeader title="Deliveries" />
      <EmptyState
        title="Your driver account is not active"
        description="The vendor you drive for has deactivated your account. Contact them if you think this is a mistake."
      />
    </>
  );
}
