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

// Enterprise details transcribed from the owner's supplied Udyam certificate.
// The support address was supplied separately; it is not the registered address.
export const publicBusiness = {
  name: "SENGANTHAL INVESTMENT GROUP",
  proprietor: "Jayamohan",
  description: "Udyam-registered sole proprietorship",
  registeredAddress: "No. 3/3A, Mela Street, Thombakkulam, Keelarajakularaman, Virudhunagar, Tamil Nadu – 626136, India",
  supportAddress: "118/7, Ganesh Nagar, Venkatachalapuram, Theni, Tamil Nadu – 625534, India"
} as const;

export const businessDetailsPending = [
  "Tax registration eligibility before paid launch",
  "Commercial market-data permissions",
  "Razorpay checkout, subscription management and live approval"
] as const;
