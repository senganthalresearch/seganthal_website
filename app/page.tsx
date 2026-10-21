import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import Terminal from "@/components/terminal";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (process.env.SHARE_DEMO === "true") redirect("/preview");
  let member;
  try { member = await currentMember(); } catch { redirect("/login?error=ServiceUnavailable"); }
  if (!member) redirect("/login");
  if (member.role !== "admin" && (!member.emailVerifiedAt || !member.onboardedAt)) redirect("/complete-account");
  return <Terminal member={member} />;
}

