import type { Metadata } from "next";
import { ReviewPage } from "@/components/review-page";
export const metadata: Metadata = { title: "Cancellation Policy | Senganthal", robots: { index: true, follow: true } };
export default function Page() { return <ReviewPage page="cancellation-policy"/>; }
