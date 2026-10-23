import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/risk-disclosure", reviewPages["risk-disclosure"].title + " | Senganthal", reviewPages["risk-disclosure"].intro);
export default function Page() { return <ReviewPage page="risk-disclosure"/>; }
