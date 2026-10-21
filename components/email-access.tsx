"use client";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

export function EmailAccess({ emailAvailable }: { emailAvailable: boolean }) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function post(action: "reset-send" | "reset") {
    const response = await fetch("/api/email-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, email, code, password }) });
    const data = await response.json() as { error?: string; message?: string };
    if (!response.ok) throw new Error(data.error || "Could not complete this request.");
    return data;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      if (mode === "reset") await post("reset");
      const result = await signIn("email-password", { email, password, redirect: false, callbackUrl: "/" });
      if (!result?.ok || result.error) throw new Error("Email or password is incorrect. Use reset if you forgot your password.");
      window.location.assign("/");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return <div className="email-access">
    <div className="email-access-tabs" role="tablist" aria-label="Email account options">
      <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setMessage(""); }}>Email sign in</button>
      <button type="button" role="tab" aria-selected={mode === "reset"} onClick={() => { setMode("reset"); setMessage(""); }}>Reset password</button>
    </div>
    <form onSubmit={event => void submit(event)}>
      <label>Email username<input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} /></label>
      {mode === "reset" && <div className="email-code-row"><label>Six-digit email code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /></label><button type="button" disabled={!emailAvailable || busy || !email} onClick={async () => { setBusy(true); setMessage(""); try { const result = await post("reset-send"); setSent(true); setMessage(result.message || "If this account exists, a code has been sent."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not send code."); } finally { setBusy(false); } }}>{sent ? "Send again" : "Send code"}</button></div>}
      <label>{mode === "reset" ? "Choose a new password (12+ characters)" : "Password"}<input required minLength={mode === "reset" ? 12 : undefined} maxLength={128} type="password" autoComplete={mode === "reset" ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button className="button primary email-submit" disabled={busy || (mode === "reset" && (!emailAvailable || !sent))}>{busy ? "Please wait…" : mode === "reset" ? "Reset and sign in" : "Sign in with email"}</button>
    </form>
    {mode === "reset" && !emailAvailable && <p className="small muted">Email verification is being configured.</p>}
    {message && <p role="status" className="small">{message}</p>}
  </div>;
}
