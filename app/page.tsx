import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { hasAccess } from "@/lib/membership";
import Terminal from "@/components/terminal";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (process.env.SHARE_DEMO === "true") redirect("/preview");
  let member;
  try { member = await currentAccount(); } catch { redirect("/login?error=ServiceUnavailable"); }
  if (!member) redirect("/login");
  if (!hasAccess(member)) redirect("/subscribe");
  return <Terminal member={member} />;
}

