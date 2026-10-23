import { publicMetadata } from "@/lib/seo";
import { reviewPages } from "@/lib/review-pages";
import { ReviewPage } from "@/components/review-page";
export const metadata = publicMetadata("/grievance", reviewPages["grievance"].title + " | Senganthal", reviewPages["grievance"].intro);
export default function Page() { return <ReviewPage page="grievance"/>; }
