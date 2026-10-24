import { publicBusiness } from "./public-content";

export const reviewPages = {
  about: {
    title: "Research with a clearer view",
    intro: "Senganthal is a financial data and analytics website for people studying Indian listed companies and markets.",
    sections: [
      ["What the workspace provides", "Company financial information, historical market data, interactive price charts, financial ratios, screening tools, news and personal watchlists. Members can record their own observations and portfolio transactions."],
      ["How to use it", "Figures can be delayed, incomplete or revised by their sources. Check exchange announcements and original company filings before relying on a figure. Screening results and scores are research aids, not instructions to trade."],
      ["What this website does not provide", "The current software does not execute trades, hold customer funds, manage investment portfolios or guarantee returns. Watchlists and portfolio records are entered by members themselves. Classes and community activities are separate from the analytics software."],
      ["Who operates Senganthal", `Senganthal is operated under ${publicBusiness.name}, an ${publicBusiness.description}. The proprietor is recorded as ${publicBusiness.proprietor} on the Udyam certificate. The enterprise is classified as Micro, with Services as its major activity. See Contact for the registered enterprise address and separate support correspondence address.`]
    ]
  },
  contact: {
    title: "Contact us",
    intro: "Questions about account access, data, classes or a future subscription? Contact the Senganthal team directly.",
    sections: [
      ["Customer support", "Email senganthalreserch@gmail.com or call +91 90258 39615. Include the email linked to your account and a short description. Never send your password, email code or full card details."],
      ["Business identity", `${publicBusiness.name} · ${publicBusiness.description}. Proprietor recorded on the Udyam certificate: ${publicBusiness.proprietor}. Senganthal is the website brand; the enterprise is a proprietorship, not a private limited company.`],
      ["Registered enterprise address", publicBusiness.registeredAddress],
      ["Support correspondence address", publicBusiness.supportAddress],
      ["Support availability", "Monday–Sunday, 6 PM–10 PM IST. You may email outside these hours; requests will be handled during support hours."],
      ["Grievance contact", "Surya · senganthalreserch@gmail.com · +91 90258 39615. Include your account email and a description of the concern."]
    ]
  },
  pricing: {
    title: "Access and pricing",
    intro: "Annual membership for financial data and independent research tools. Checkout availability is shown below.",
    sections: [
      ["Annual access · ₹599 per year", "₹599 total for one year of access. Razorpay card subscriptions renew automatically only after your explicit authorisation at checkout. When enabled, business UPI QR payments provide one year from admin approval and must be renewed manually. No additional GST is being charged; the operator is not GST-registered. Purchases are available only when checkout is enabled."],
      ["Included tools", "Company financial data, historical charts, financial ratios, stock screening, personal watchlists and research notes. Classes are separate and are not included in this software subscription. Availability depends on data-provider access; live exchange data is not promised."],
      ["Current access", "New members can register with Google, verify their email and choose a site password. Returning members sign in with their email and site password. Research tools require a verified paid membership. Administrators have included access. Unpaid members can manage their account and billing."],
      ["Activation, cancellation and refunds", "Annual access will start only after successful payment verification. Cancelling stops the next renewal and access continues through the paid year. Request a full refund within 7 calendar days of your first purchase. Duplicate or incorrect charges are also eligible for refund after verification. Approved refunds are initiated within 7 working days; bank processing time is additional."]
    ], pending: true
  },
  "privacy-policy": {
    title: "Privacy policy",
    intro: "How the current Senganthal workspace handles account, research and usage information.",
    sections: [
      ["Information we collect", "Registration uses a Google-verified email address and name. First-time setup collects an email verification code, contact mobile number and site password. We store a salted password hash, not the password. The workspace stores research you choose to save, including watchlists, portfolio entries, notes and team chat posts. Technical logs and usage counters help us operate and protect the service."],
      ["How we use it", "We use account information to authenticate users, provide their workspace, manage permissions, deliver verification emails, respond to support requests and prevent abuse. Chat posts are visible to other authorised workspace members."],
      ["Cookies and providers", "Session cookies keep users signed in. Google provides initial account verification; Resend sends account email codes. Render hosts the application and MongoDB stores account and workspace data. Market data and news come from external sources whose availability can change."],
      ["Payments", "When checkout is enabled, Razorpay processes payments. We store subscription and payment references, payment status, billing periods and renewal consent to manage access and support. Card details are handled by Razorpay and are not stored by this website. For manual UPI payments, we store your signed-in email, payer name, UPI reference, payment date, screenshot and admin review history in our database. Screenshots are available only to the submitting account and administrators. Resend sends review notifications. Hide unrelated balances and transactions before uploading. Payment proofs are retained with payment records for support and dispute resolution; you can request deletion through support, subject to retention obligations."],
      ["Retention and requests", "Account records and saved research have no automatic expiry and are retained until manually removed by the operator. Deletion requests are handled by support; records needed for legal obligations or dispute resolution may be retained. Database backups follow the hosting provider's retention settings and may retain copies after deletion from the active database. To request access, correction, deletion or account closure, email senganthalreserch@gmail.com. Account ownership may need to be verified before action."],
      ["Operator and changes", `${publicBusiness.name}, a sole proprietorship with proprietor ${publicBusiness.proprietor}, operates this website. Use the contact and grievance pages for privacy concerns. Material changes to the data collected or its use will be described on this page before those features launch.`]
    ]
  },
  "terms-and-conditions": {
    title: "Terms and conditions",
    intro: "These terms govern the research workspace and purchases made when checkout is available.",
    sections: [
      ["Service", "Senganthal displays financial data, charts, screening, news links and tools to organise independent research. Data can be delayed, incomplete, unavailable or inaccurate. Check original exchange and company sources before making a financial decision."],
      ["Accounts and permitted use", "Users must provide accurate registration information, keep their site password confidential and use only accounts they are authorised to access. Automated scraping, bypassing access controls, abusive posts and redistribution of data without relevant rights are not permitted. Access may be restricted for misuse."],
      ["Eligibility", "You must have the legal capacity to enter a subscription agreement and be authorised to use the payment method before purchasing access. Do not submit personal information or payments on another person's behalf without their permission."],
      ["Investment decisions", "The software does not execute transactions or hold customer assets. Scores, filters and charts are analytical aids, not a promise of returns or a substitute for independent professional advice. Users remain responsible for their decisions."],
      ["Operator and support", `The service is operated under ${publicBusiness.name}, an ${publicBusiness.description}, with proprietor ${publicBusiness.proprietor}. Registered enterprise address: ${publicBusiness.registeredAddress}. The separate support correspondence address is listed on Contact. Account and service concerns can be sent to senganthalreserch@gmail.com. Unresolved concerns may be escalated to Surya using the grievance page; statutory consumer rights are unaffected.`],
      ["Subscriptions", "Annual access is ₹599. Razorpay card subscriptions renew yearly only with your authorisation. Business UPI QR payments, when enabled, require a screenshot and transaction reference followed by manual receipt verification. Submission does not grant access. Approved UPI membership lasts one year from approval, with no automatic debit. Cancellation stops the next renewal while preserving access until the paid year ends. A full refund may be requested within 7 days of the first purchase; duplicate and incorrect charges are also eligible for review. Read the pricing, refund and cancellation pages before purchase."]
    ], pending: true
  },
  "refund-policy": {
    title: "Refund policy",
    intro: "This policy applies to membership purchases made through Senganthal when checkout is available.",
    sections: [
      ["Seven-day refund for the first purchase", "You may request a full refund within 7 calendar days of your first subscription purchase, including if you have used the digital tools. Email senganthalreserch@gmail.com from your account email with the payment reference. Duplicate payments and incorrectly charged amounts are also eligible for refund after verification."],
      ["Renewals and access", "The seven-day first-purchase offer does not extend to annual renewal payments. Duplicate or incorrect renewal charges remain eligible for correction or refund. Statutory rights are unaffected. A refunded subscription will end and its future renewal will be cancelled."],
      ["Manual UPI payments", "The same refund eligibility applies to manual UPI payments. Contact support with your UPI reference and account email. Administrators verify and arrange an approved refund through the merchant payment provider, record the refund reference, and revoke the corresponding membership. Revoking access on the website does not itself transfer money."],
      ["Processing", "Approved refunds will be initiated within 7 working days and returned to the original payment method. Banks and payment providers require additional processing time, which varies by payment method. Support will provide the refund reference when available. Cancelling renewal alone does not request a refund; include your refund request explicitly in your email."],
      ["If you believe you were charged", "Contact senganthalreserch@gmail.com with a transaction reference. Do not send card numbers or account passwords."]
    ], pending: true
  },
  "cancellation-policy": {
    title: "Cancellation policy",
    intro: "Manage renewal from Account & billing or contact support.",
    sections: [
      ["Manual UPI membership", "QR payments have no automatic renewal to cancel. Membership expires at the displayed end date. To request a refund, contact support under the refund policy."],
      ["Stop future renewal", "Cancellation stops the next annual renewal. Access continues until the end of the already-paid year, unless a refund is granted. Cancellation does not automatically refund the current year; see the separate refund policy."],
      ["Request cancellation", "Email senganthalreserch@gmail.com from your account email with the subscription reference. Ask to stop future renewals and retain the confirmation from support. You can also use Cancel renewal on Account & billing and check the resulting confirmation."]
    ], pending: true
  },
  "risk-disclosure": {
    title: "Market risk disclosure",
    intro: "Financial markets involve uncertainty. Use the research tools with an understanding of their limits.",
    sections: [
      ["Investment risk", "Stocks, derivatives and other market products can lose value, including a substantial or total loss of invested capital. Past performance, historical charts and back-calculated indicators do not predict future returns. Leverage and illiquid instruments add risk."],
      ["Data and analytical limits", "Quotes, fundamentals, company filings and news may be delayed, incomplete, revised or unavailable. Screens and scores apply rules to the data available to the website; a score is not a buy, sell or hold instruction. Verify figures in original company and exchange disclosures."],
      ["Recommendations and advice", "The operator is not registered with SEBI as an investment adviser or research analyst. The current software is intended for independent data exploration and does not assess your financial circumstances or suitability. Stock-specific recommendations, model portfolios, target prices or paid research services require separate legal and regulatory review before they could be offered."]
    ]
  },
  grievance: {
    title: "Grievance support",
    intro: "Tell us when something about your account, data or service is not working as expected.",
    sections: [
      ["How to raise a concern", "Email senganthalreserch@gmail.com with the account email, the issue and the outcome you request. You may also call +91 90258 39615. Do not send passwords, one-time codes or full card details."],
      ["Grievance contact", `Surya, on behalf of ${publicBusiness.name}. Support correspondence address: ${publicBusiness.supportAddress}. The registered enterprise address is listed on Contact. Contact senganthalreserch@gmail.com or +91 90258 39615.`],
      ["Response timeline", "We aim to acknowledge complaints within 48 hours and resolve them within 30 days of receipt. If investigation requires more time, we will explain the reason and provide an update. Follow up on the same email thread so the history of your concern is available. Support hours are Monday–Sunday, 6 PM–10 PM IST."]
    ]
  },
  "subscription-success": {
    title: "Subscription status",
    intro: "This page cannot confirm a payment or grant account access.",
    sections: [["Payment verification", "Opening this page does not mean a payment succeeded. Visit Account & billing to check the verified payment status. If you believe you were charged, contact support with your payment reference; your account access should be confirmed before you retry."]]
  },
  "subscription-failed": {
    title: "Payment status",
    intro: "A subscription could not be confirmed from this page.",
    sections: [["Need help?", "Check Account & billing for the verified payment status. If you believe a payment was taken, contact support with the transaction reference. Do not retry a charge based only on a browser message."]]
  }
} as const;

export type ReviewPageKey = keyof typeof reviewPages;
