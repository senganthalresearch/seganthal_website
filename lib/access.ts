export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function owners() { return (process.env.ADMIN_EMAILS || "").split(",").map(normalizeEmail).filter(Boolean); }
export function maySignIn(provider: string | undefined, verified: unknown, active: boolean) { return provider === "google" && verified === true && active; }
