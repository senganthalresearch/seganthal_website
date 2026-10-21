import { configured } from "@/lib/auth";
import Login from "@/components/login";
import { db } from "@/lib/db";
import { announcementSchema, defaultSettings } from "@/lib/site-settings";
import { emailDeliveryConfigured } from "@/lib/email-otp";
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: {searchParams: Promise<{error?: string}>}) {
  const params = await searchParams;
  let announcement = defaultSettings.announcement;
  try {
    const saved = await (await db()).collection("settings").findOne({ key: "site" }, { projection: { announcement: 1, _id: 0 } });
    const parsed = announcementSchema.safeParse(saved?.announcement);
    if (parsed.success) announcement = parsed.data;
  } catch {
    // Keep the public login page available when the content database is offline.
  }
  return <Login configured={configured()} error={params.error} emailAvailable={emailDeliveryConfigured()} previewAvailable={process.env.NODE_ENV === "development" || process.env.SHARE_DEMO === "true"} announcement={announcement} />;
}

