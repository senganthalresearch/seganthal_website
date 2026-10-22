import type { Metadata } from "next";
import { ReviewPage } from "@/components/review-page";
export const metadata: Metadata = { title: "Subscription Failed | Senganthal", robots: { index: false, follow: false } };
export default function Page() { return <ReviewPage page="subscription-failed"/>; }
