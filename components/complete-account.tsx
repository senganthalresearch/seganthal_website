"use client";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";

export function CompleteAccount({ email, initiallyVerified, emailAvailable }: { email: string; initiallyVerified: boolean; emailAvailable: boolean }) {
  const [verified, setVerified] = useState(initiallyVerified);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function post(body: Record<string, string>) {
    const response = await fetch("/api/email-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error || "Could not complete account setup.");
  }

  async function act(action: "send" | "verify" | "complete") {
    if (action === "complete" && password !== confirmPassword) { setMessage("The passwords do not match."); return; }
    setBusy(true); setMessage("");
    try {
      await post({ action, code, phone, password });
      if (action === "send") { setSent(true); setMessage(`A code was sent to ${email}.`); }
      if (action === "verify") { setVerified(true); setMessage("Email verified. Finish setting up your account."); }
      if (action === "complete") window.location.assign("/workspace");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not complete account setup."); }
    finally { setBusy(false); }
  }

  return <main className="account-setup"><section className="account-setup-card"><img src="/senganthal-logo-transparent.png" alt="Senganthal" /><span className="eyebrow">ACCOUNT SETUP</span><h1>Secure your research account</h1><p>Your username is <strong>{email}</strong>. Verify this address once, then sign in with this email and the site password you choose.</p>
    {!verified ? <form onSubmit={(event: FormEvent) => { event.preventDefault(); void act("verify"); }}>
      <button className="button secondary" type="button" disabled={!emailAvailable || busy} onClick={() => void act("send")}>{sent ? "Send a new code" : "Send email code"}</button>
      <label>Six-digit email code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /></label>
      <button className="button primary" disabled={!sent || busy}>Verify email</button>
      {!emailAvailable && <p className="small muted">Email verification is being configured. Please try again later.</p>}
    </form> : <form onSubmit={(event: FormEvent) => { event.preventDefault(); void act("complete"); }}>
      <label>Mobile contact number<input required inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={event => setPhone(event.target.value)} /></label>
      <p className="small muted">This number is saved for contact only. Sign-in codes are sent to your email.</p>
      <label>Choose a site password (12+ characters)<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label>Confirm site password<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
      <button className="button primary" disabled={busy}>Complete account</button>
    </form>}
    {message && <p role="status">{message}</p>}
    <button type="button" className="text-button" onClick={() => void signOut({ callbackUrl: "/login" })}>Use a different Google account</button>
  </section></main>;
}
