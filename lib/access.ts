export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function owners() { return (process.env.ADMIN_EMAILS || "").split(",").map(normalizeEmail).filter(Boolean); }
export function googleSignupDecision(verified: unknown, administrator: boolean, existing?: { active: boolean; onboardedAt?: string } | null) {
  if (verified !== true) return "denied";
  if (existing && !existing.active) return "denied";
  if (administrator) return "allow";
  if (existing?.onboardedAt) return "already-registered";
  return "allow";
}
