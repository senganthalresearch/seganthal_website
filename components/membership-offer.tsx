export function MembershipOffer() {
  return <section className="membership-offer" aria-labelledby="membership-heading">
    <div><span className="public-eyebrow">Annual membership</span><h2 id="membership-heading">Your research workspace, all year.</h2>
      <p>Company financials, charts, screening tools, watchlists and portfolio tracking. Classes are separate.</p>
      <p className="small muted">Create your account first. Tools unlock after payment verification. Annual renewal requires your authorization.</p></div>
    <div className="membership-price"><strong>₹599 <small>/ year</small></strong><a className="button primary" href="/account">Get yearly access</a>
      <span className="small"><a href="/refund-policy">7-day first-purchase refund</a> · <a href="/pricing">Plan details</a></span></div>
  </section>;
}
