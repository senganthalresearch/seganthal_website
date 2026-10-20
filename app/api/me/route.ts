import { api, HttpError } from "@/lib/http";
import { currentAccount } from "@/lib/auth";
import { hasAccess } from "@/lib/membership";

export const GET = api(async () => {
  const member = await currentAccount();
  if (!member) throw new HttpError(401, "Sign in to continue.");
  if (!hasAccess(member)) throw new HttpError(402, "Subscription required.");
  return { member };
});
