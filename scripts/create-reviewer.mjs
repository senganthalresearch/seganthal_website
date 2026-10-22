import { randomBytes, scrypt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

async function main() {
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const digest = await promisify(scrypt)(password, salt, 64);
  const passwordHash = `scrypt:${salt}:${digest.toString("hex")}`;
  const expires = new Date(Date.now() + 14 * 86400000).toISOString();
  const email = "razorpay-review@senganthal.co.in";
  const directory = resolve(".data");
  await mkdir(directory, { recursive: true });
  const file = resolve(directory, "razorpay-reviewer-credentials.txt");
  await writeFile(file, [
    "PRIVATE — do not commit, paste into chat, or email broadly.",
    "This demo identity is not a mailbox and cannot receive email.",
    "It opens synthetic/sample data only, never production member records.",
    "Provide the following SITE login only through Razorpay's official verification form:",
    "URL: https://www.senganthal.co.in/login", `Username: ${email}`, `Password: ${password}`, "",
    "Set these server environment variables privately in Render and redeploy:",
    "REVIEWER_LOGIN_ENABLED=true", `REVIEWER_LOGIN_EMAIL=${email}`,
    `REVIEWER_PASSWORD_HASH=${passwordHash}`, `REVIEWER_ACCESS_EXPIRES_AT=${expires}`, "",
    "Do not add this identity to ADMIN_EMAILS or create a normal member with this email.",
    "Test login, sample-data badge, API denial and sign-out after deployment.",
    "Disable REVIEWER_LOGIN_ENABLED after review; expiry also invalidates its sessions.",
    "If Razorpay requires live checkout inspection, this demo is not a payment test.", ""
  ].join("\n"), { flag: "wx", mode: 0o600 });
  console.log(`Private credentials saved to ${file}. No secrets printed.`);
}
main().catch(error => { console.error(error?.code === "EEXIST" ? "Credentials file already exists; kept unchanged." : "Could not create reviewer credentials."); process.exitCode = 1; });
