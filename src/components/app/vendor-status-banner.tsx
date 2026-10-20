import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/labels";
import type { VendorProfile } from "@/server/db/schema";

export function VendorStatusBanner({ profile }: { profile: VendorProfile }) {
  switch (profile.verificationStatus) {
    case "draft":
      return (
        <Alert tone="info" title="Not yet submitted">
          Complete your identity details and documents, then submit them for verification.
        </Alert>
      );
    case "submitted":
    case "under_review":
      return (
        <Alert tone="info" title={profile.verificationStatus === "submitted" ? "Submitted for verification" : "Under review"}>
          Submitted {formatDateTime(profile.submittedAt)}. Our team is checking your details.
        </Alert>
      );
    case "info_required":
      return (
        <Alert tone="warning" title="More information needed">
          {profile.reviewNote ?? "Our team needs more information."} Update your details and submit again.
        </Alert>
      );
    case "verified":
      return (
        <Alert tone="success" title="Verified vendor">
          Your account was verified {formatDateTime(profile.reviewedAt)}. Approved trucks can now take bookings.
        </Alert>
      );
    case "rejected":
      return (
        <Alert tone="error" title="Verification declined">
          {profile.reviewNote ?? "Your application was declined."} You can correct your details and submit again.
        </Alert>
      );
    case "suspended":
      return (
        <Alert tone="error" title="Account suspended">
          {profile.reviewNote ?? "Your vendor account is suspended."} Contact WCE Logistics support to resolve this.
        </Alert>
      );
  }
}
