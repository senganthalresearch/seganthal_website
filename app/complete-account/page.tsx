import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { emailDeliveryConfigured } from "@/lib/email-otp";
import { CompleteAccount } from "@/components/complete-account";
export const dynamic = "force-dynamic";

export default async function CompleteAccountPage() {
  const member = await currentMember();
  if (!member) redirect("/login");
  if (member.reviewDemo || member.role === "admin" || member.onboardedAt) redirect("/");
  return <CompleteAccount email={member.email} initiallyVerified={Boolean(member.emailVerifiedAt)} emailAvailable={emailDeliveryConfigured()} />;
}
