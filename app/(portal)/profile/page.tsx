import { ProfileClient, ProfileLoadingFallback } from "@/components/profile/profile-client";
import { Suspense } from "react";

export const instant = false;

export default function ReceptionistProfilePage() {
  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <ProfileClient />
    </Suspense>
  );
}
