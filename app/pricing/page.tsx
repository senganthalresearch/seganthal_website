import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/pricing", reviewPages["pricing"].title + " | Senganthal", reviewPages["pricing"].intro);
export default function Page() { return <ReviewPage page="pricing"/>; }
