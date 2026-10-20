import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { SubscribeClient } from "@/components/subscribe-client";
export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const account = await currentAccount();
  if (!account) redirect("/login#workspace-access");
  return <SubscribeClient name={account.name || account.username || "Member"} email={account.authProvider === "phone" ? "" : account.email} phone={account.phone || ""} />;
}
