import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/terms-and-conditions", reviewPages["terms-and-conditions"].title + " | Senganthal", reviewPages["terms-and-conditions"].intro);
export default function Page() { return <ReviewPage page="terms-and-conditions"/>; }
