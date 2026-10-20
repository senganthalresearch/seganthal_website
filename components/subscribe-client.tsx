"use client";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type Status = { hasAccess: boolean; billingConfigured: boolean; account: { email: string; username?: string; paidUntil?: string; adminGrantUntil?: string }; subscriptions: {subscriptionId:string;status:string;paidUntil?:string;cancelAtCycleEnd?:boolean}[] };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } } }

export function SubscribeClient({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/billing", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load your subscription status.");
    const data = await response.json() as Status;
    setStatus(data);
    return data;
  }, []);
  useEffect(() => { void refresh().catch(error => setMessage(error.message)); }, [refresh]);

  async function start() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json() as { error?: string; subscriptionId?: string; keyId?: string };
      if (!response.ok || !data.subscriptionId || !data.keyId) throw new Error(data.error || "Could not start checkout.");
      if (!window.Razorpay) await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Could not load secure checkout.")); document.head.appendChild(script);
      });
      if (!window.Razorpay) throw new Error("Secure checkout is unavailable.");
      const checkout = new window.Razorpay({ key: data.keyId, subscription_id: data.subscriptionId, name: "Senganthal Research", description: "₹600 yearly membership · automatic renewal", prefill: { name, email, contact: phone }, handler: async () => {
        setMessage("Payment submitted. Waiting for verified confirmation from Razorpay…");
        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const latest = await refresh();
          if (latest.hasAccess) { window.location.assign("/"); return; }
        }
        setMessage("We have not received payment confirmation yet. Please refresh this page shortly. Do not pay again until the status updates.");
      }, modal: { ondismiss: () => setBusy(false) } });
      checkout.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start checkout."); }
    finally { setBusy(false); }
  }

  async function cancelRenewal() {
    if (!window.confirm("Stop automatic renewal after your current paid period?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json() as {error?:string};
      if (!response.ok) throw new Error(data.error || "Could not cancel renewal.");
      await refresh(); setMessage("Automatic renewal cancelled. Your paid access continues until the end of the current period.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not cancel renewal."); }
    finally { setBusy(false); }
  }

  return <main className="subscribe-page"><header><a href="/login"><img src="/senganthal-logo-transparent.png" alt="Senganthal" /> SENGANTHAL</a><button className="button secondary" onClick={() => void signOut({ callbackUrl: "/login" })}>Sign out</button></header><section className="subscribe-card"><span className="eyebrow">SENGANTHAL MEMBERSHIP</span><h1>Research access for ₹600 a year</h1><p>Explore market tools, your portfolio and the research community. Your subscription renews automatically every year until cancelled.</p><div className="subscribe-price"><strong>₹600</strong><span>per year · INR</span></div><ul><li>Full workspace access</li><li>Google or verified mobile sign-in</li><li>Admin-granted access does not require payment</li></ul>{status?.hasAccess ? <div className="alert" role="status"><strong>Access active</strong><p>Your access is valid until {status.account.paidUntil || status.account.adminGrantUntil ? new Date(status.account.paidUntil || status.account.adminGrantUntil || "").toLocaleDateString("en-IN") : "unlimited"}.</p><a className="button primary" href="/">Open workspace</a></div> : <><button className="button primary subscribe-pay" disabled={busy || !status?.billingConfigured} onClick={() => void start()}>{busy ? "Opening checkout…" : "Subscribe with Razorpay"}</button>{status && !status.billingConfigured && <p className="small muted">Secure checkout is awaiting merchant setup. Contact the Senganthal team for access.</p>}</>}{status?.subscriptions.length ? <div className="subscribe-history"><h2>Your subscriptions</h2>{status.subscriptions.map(item => <p key={item.subscriptionId}>{item.status} · {item.subscriptionId}{item.paidUntil ? ` · paid through ${new Date(item.paidUntil).toLocaleDateString("en-IN")}` : ""}{item.cancelAtCycleEnd ? " · renewal cancelled" : ""}</p>)}{status.subscriptions.some(item => ["active", "authenticated"].includes(item.status) && !item.cancelAtCycleEnd) && <button className="text-button" disabled={busy} onClick={() => void cancelRenewal()}>Cancel automatic renewal</button>}</div> : null}{message && <p role="status" className="subscribe-message">{message}</p>}<button className="text-button" onClick={() => void refresh().catch(error => setMessage(error.message))}>Refresh access status</button></section></main>;
}
