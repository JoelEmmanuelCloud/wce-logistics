import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Card, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import { findVendorProfileByUser, vendorIsEditable } from "@/server/vendors";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Business profile" };

export default async function VendorProfilePage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  const editable = !profile || vendorIsEditable(profile);

  return (
    <>
      <PageHeader
        title="Business profile"
        description="Step 1 of 3. Tell us who you are and where you operate. This is what shippers and our verification team will see."
      />
      {!editable && (
        <div className="mb-6">
          <Alert tone="info" title="Profile locked during review">
            You can edit your details again if our team asks for more information.
          </Alert>
        </div>
      )}
      <Card>
        <ProfileForm
          isNew={!profile}
          editable={editable}
          defaults={{
            category: profile?.category ?? "",
            legalName: profile?.legalName ?? user.fullName ?? "",
            businessName: profile?.businessName ?? "",
            email: profile?.email ?? user.email ?? "",
            addressLine: profile?.addressLine ?? "",
            city: profile?.city ?? "",
            state: profile?.state ?? "",
            operatingStates: profile?.operatingStates ?? [],
            cacNumber: profile?.cacNumber ?? "",
          }}
        />
      </Card>
    </>
  );
}
