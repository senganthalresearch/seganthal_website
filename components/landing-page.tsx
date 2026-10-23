import { configured } from '@/lib/auth';
import Login from '@/components/login';
import { db } from '@/lib/db';
import { announcementSchema, defaultSettings } from '@/lib/site-settings';
import { emailDeliveryConfigured } from '@/lib/email-otp';

// Public content is available without a session and survives a DB outage.
export async function LandingPage({ error }: { error?: string }) {
  let announcement = defaultSettings.announcement;
  try {
    const saved = await (await db()).collection('settings').findOne({ key: 'site' }, { projection: { announcement: 1, _id: 0 } });
    const parsed = announcementSchema.safeParse(saved?.announcement);
    if (parsed.success) announcement = parsed.data;
  } catch { /* Keep public information accessible during database outages. */ }
  return <Login configured={configured()} error={error} emailAvailable={emailDeliveryConfigured()} previewAvailable={process.env.NODE_ENV === 'development'} announcement={announcement}/>;
}
