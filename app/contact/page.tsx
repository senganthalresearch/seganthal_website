import type { Metadata } from "next";
import { ReviewPage } from "@/components/review-page";
export const metadata: Metadata = { title: "Contact | Senganthal", robots: { index: true, follow: true } };
export default function Page() { return <ReviewPage page="contact"/>; }
