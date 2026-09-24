import { api, requireMember } from "@/lib/http";

export const GET = api(async () => {
  const member = await requireMember();
  return { member };
});
