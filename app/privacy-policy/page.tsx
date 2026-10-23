import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/privacy-policy", reviewPages["privacy-policy"].title + " | Senganthal", reviewPages["privacy-policy"].intro);
export default function Page() { return <ReviewPage page="privacy-policy"/>; }
