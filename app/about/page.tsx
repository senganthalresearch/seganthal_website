import Link from "next/link";
import { redirect } from "next/navigation";
import { AboutUs } from "@/components/community";
import styles from "@/components/about.module.css";
import { currentMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const member = await currentMember();
  if (!member) redirect("/login");

  const settings = await (await db()).collection("settings").findOne({ key: "site" });

  return (
    <main className={styles.aboutPageShell}>
      <Link className={styles.backLink} href="/">
        Back to dashboard
      </Link>
      <AboutUs content={settings?.about || defaultSettings.about} mode="page" />
    </main>
  );
}
