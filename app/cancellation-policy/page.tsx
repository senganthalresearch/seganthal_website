import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/cancellation-policy", reviewPages["cancellation-policy"].title + " | Senganthal", reviewPages["cancellation-policy"].intro);
export default function Page() { return <ReviewPage page="cancellation-policy"/>; }
