export const publicLinks = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms-and-conditions", label: "Terms" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/cancellation-policy", label: "Cancellation" },
  { href: "/risk-disclosure", label: "Risk disclosure" },
  { href: "/grievance", label: "Grievances" }
] as const;

export const publicContact = {
  email: "senganthalreserch@gmail.com",
  phoneDisplay: "+91 90258 39615",
  phoneHref: "+919025839615"
} as const;

export const businessDetailsPending = [
  "Tax registration eligibility before paid launch",
  "Commercial market-data permissions",
  "Razorpay checkout, subscription management and live approval"
] as const;
