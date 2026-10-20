import { notFound } from "next/navigation";
import Terminal from "@/components/terminal";
export const dynamic = "force-dynamic";
export default function Preview() {
  if (process.env.NODE_ENV !== "development" && process.env.SHARE_DEMO !== "true") notFound();
  return <Terminal preview member={{ name: "Research preview", email: "", role: "admin", active: true }} />;
}

