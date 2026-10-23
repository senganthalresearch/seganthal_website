import { notFound } from "next/navigation";
import Terminal from "@/components/terminal";
import { privateRobots } from '@/lib/seo';
export const metadata = { title: 'Preview | Senganthal', robots: privateRobots };
export const dynamic = "force-dynamic";
export default function Preview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Terminal preview member={{ name: "Research preview", email: "", role: "admin", active: true }} />;
}

