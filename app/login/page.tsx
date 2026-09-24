import { configured } from "@/lib/auth";
import Login from "@/components/login";
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: {searchParams: Promise<{error?: string}>}) {
  const params = await searchParams;
  return <Login configured={configured()} error={params.error} previewAvailable={process.env.NODE_ENV === "development"} />;
}

