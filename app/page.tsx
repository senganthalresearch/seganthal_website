import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import Terminal from "@/components/terminal";
export const dynamic = "force-dynamic";
export default async function Home() {
  let member;
  try { member = await currentMember(); } catch { redirect("/login?error=ServiceUnavailable"); }
  if (!member) redirect("/login");
  return <Terminal member={member} />;
}

