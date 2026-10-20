"use client";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

type Mode = "login" | "register" | "reset";
export function PhoneAccess({ available }: { available: boolean }) {
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function post(action: "send" | "register" | "reset") {
    const response = await fetch("/api/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, phone, name, password, code }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error || "Could not complete mobile verification.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode !== "login") await post(mode);
      const result = await signIn("credentials", { phone, password, redirect: false, callbackUrl: "/" });
      if (result?.error) throw new Error("The mobile number or password is incorrect.");
      window.location.assign("/");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return <div className="phone-access">
    <div className="phone-access-tabs" role="tablist" aria-label="Mobile account options">{(["login", "register", "reset"] as const).map(value => <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => { setMode(value); setSent(false); setMessage(""); }}>{value === "login" ? "Sign in" : value === "register" ? "New mobile account" : "Reset password"}</button>)}</div>
    <form onSubmit={event => void submit(event)}>
      {mode === "register" && <label>Full name<input required maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>}
      <label>Mobile number<input required inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={event => setPhone(event.target.value)} /></label>
      {mode !== "login" && <div className="phone-otp-row"><label>SMS verification code<input required inputMode="numeric" pattern="[0-9]{4,10}" value={code} onChange={event => setCode(event.target.value)} /></label><button type="button" disabled={!available || busy || !phone} onClick={async () => { setBusy(true); setMessage(""); try { await post("send"); setSent(true); setMessage("Verification code sent. Enter it below."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not send code."); } finally { setBusy(false); } }}>{sent ? "Send again" : "Send code"}</button></div>}
      <label>{mode === "login" ? "Password" : "Choose a password (12+ characters)"}<input required minLength={mode === "login" ? undefined : 12} maxLength={128} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button className="button primary phone-submit" disabled={busy || (mode !== "login" && (!available || !sent))}>{busy ? "Please wait…" : mode === "login" ? "Sign in with mobile" : mode === "register" ? "Create account" : "Reset and sign in"}</button>
    </form>
    {!available && mode !== "login" && <p className="small muted">Mobile verification is awaiting SMS provider setup.</p>}
    {message && <p role="status" className="small">{message}</p>}
  </div>;
}
