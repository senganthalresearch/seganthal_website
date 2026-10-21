import { configured } from "@/lib/auth";
import Login from "@/components/login";
import { db } from "@/lib/db";
import { announcementSchema, dailyStockSchema, defaultSettings } from "@/lib/site-settings";
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: {searchParams: Promise<{error?: string}>}) {
  const params = await searchParams;
  let announcement = defaultSettings.announcement;
  let dailyStock = defaultSettings.dailyStock;
  try {
    const saved = await (await db()).collection("settings").findOne({ key: "site" }, { projection: { announcement: 1, dailyStock: 1, _id: 0 } });
    const parsed = announcementSchema.safeParse(saved?.announcement);
    if (parsed.success) announcement = parsed.data;
    const stock = dailyStockSchema.safeParse(saved?.dailyStock);
    if (stock.success) dailyStock = stock.data;
  } catch {
    // Keep the public login page available when the content database is offline.
  }
  return <Login configured={configured()} phoneAvailable={Boolean(process.env.TWOFACTOR_API_KEY)} error={params.error} previewAvailable={process.env.NODE_ENV === "development" || process.env.SHARE_DEMO === "true"} announcement={announcement} dailyStock={dailyStock} />;
}

