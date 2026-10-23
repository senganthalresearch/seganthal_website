import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/refund-policy", reviewPages["refund-policy"].title + " | Senganthal", reviewPages["refund-policy"].intro);
export default function Page() { return <ReviewPage page="refund-policy"/>; }
