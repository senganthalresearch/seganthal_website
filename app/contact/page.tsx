import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/contact", reviewPages["contact"].title + " | Senganthal", reviewPages["contact"].intro);
export default function Page() { return <ReviewPage page="contact"/>; }
