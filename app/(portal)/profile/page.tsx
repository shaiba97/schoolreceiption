import { ProfileClient } from "@/components/profile/profile-client";
import { Suspense } from "react";

export const instant = false;

export default function ReceptionistProfilePage() {
  return (
    <Suspense fallback={<div className="p-4">Loading profile…</div>}>
      <ProfileClient />
    </Suspense>
  );
}