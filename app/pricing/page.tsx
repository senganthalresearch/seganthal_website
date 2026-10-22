import type { Metadata } from "next";
import { ReviewPage } from "@/components/review-page";
export const metadata: Metadata = { title: "Pricing | Senganthal", robots: { index: true, follow: true } };
export default function Page() { return <ReviewPage page="pricing"/>; }
