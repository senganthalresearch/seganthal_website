import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/about", reviewPages["about"].title + " | Senganthal", reviewPages["about"].intro);
export default function Page() { return <ReviewPage page="about"/>; }
