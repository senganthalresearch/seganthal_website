import Link from "next/link";
import { DraftNotice, PublicPage } from "@/components/public-page";
import { reviewPages, type ReviewPageKey } from "@/lib/review-pages";
import { publicContact } from "@/lib/public-content";
import { defaultSettings } from "@/lib/site-settings";

export function ReviewPage({ page }: { page: ReviewPageKey }) {
  const content = reviewPages[page];
  return <PublicPage title={content.title} intro={content.intro}>
    {page === "about" && <div className="public-admin-profile">
      <img src={defaultSettings.about.photo} alt="Jayamohan Sundararaj, website administrator" width={72} height={72}/>
      <div><span className="public-eyebrow">Website administrator</span><h2>{defaultSettings.about.founderName}</h2><p>Individual operator of Senganthal · Theni, Tamil Nadu</p></div>
    </div>}
    {content.sections.map(([heading, body])=><section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
    {"pending" in content && content.pending && <DraftNotice/>}
    <div className="public-actions"><Link href="/login#workspace-access">Member access</Link><Link href="/contact">Contact support</Link><a href={`mailto:${publicContact.email}`}>Email us</a></div>
  </PublicPage>;
}
