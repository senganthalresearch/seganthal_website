import { z } from "zod";
import { owners } from "@/lib/access";
import { db } from "@/lib/db";
import { api, checkOrigin, requireMember } from "@/lib/http";
import type { Member } from "@/lib/types";

export const dynamic = "force-dynamic";

type Presence = {
  email: string;
  name?: string;
  role?: Member["role"];
  page?: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

const heartbeatSchema = z.object({ page: z.string().trim().max(80).optional() });
const onlineWindowMs = 2 * 60 * 1000;
const istOffsetMs = 5.5 * 60 * 60 * 1000;

function startOfTodayIst(now = new Date()) {
  const shifted = new Date(now.getTime() + istOffsetMs);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - istOffsetMs);
}

function activeMemberRows(members: Member[]) {
  const ownerRows: Member[] = owners().map(email => ({ email, name: "Owner", role: "admin", active: true }));
  const activeMembers = members.filter(member => member.active && !owners().includes(member.email));
  return [...ownerRows, ...activeMembers];
}

export const GET = api(async () => {
  await requireMember(true);
  const database = await db();
  const now = new Date();
  const onlineSince = new Date(now.getTime() - onlineWindowMs);
  const todayStart = startOfTodayIst(now);
  const members = await database.collection<Member>("members").find({}, { projection: { _id: 0 } }).toArray();
  const activeUsers = activeMemberRows(members);
  const activeEmails = new Set(activeUsers.map(user => user.email));
  const [onlineRecords, todayRecords] = await Promise.all([
    database.collection<Presence>("presence").find({ lastSeenAt: { $gte: onlineSince } }, { projection: { _id: 0 } }).toArray(),
    database.collection<Presence>("presence").find({ lastSeenAt: { $gte: todayStart } }, { projection: { _id: 0 } }).toArray()
  ]);
  const onlineUsers = onlineRecords.filter(record => activeEmails.has(record.email));
  const visitedEmails = new Set(todayRecords.filter(record => activeEmails.has(record.email)).map(record => record.email));
  const notVisitedUsers = activeUsers.filter(user => !visitedEmails.has(user.email));
  const recent = todayRecords
    .filter(record => activeEmails.has(record.email))
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    .slice(0, 6)
    .map(record => ({ email: record.email, name: record.name || record.email, role: record.role, page: record.page || "", lastSeenAt: record.lastSeenAt }));

  return {
    online: onlineUsers.length,
    visitedToday: visitedEmails.size,
    notVisitedToday: notVisitedUsers.length,
    totalActiveUsers: activeUsers.length,
    onlineWindowMinutes: Math.round(onlineWindowMs / 60000),
    todayStart: todayStart.toISOString(),
    generatedAt: now.toISOString(),
    recent
  };
});

export const POST = api(async request => {
  checkOrigin(request);
  const member = await requireMember();
  const body = await request.json().catch(() => ({}));
  const { page } = heartbeatSchema.parse(body);
  const now = new Date();
  await (await db()).collection<Presence>("presence").updateOne(
    { email: member.email },
    {
      $set: { name: member.name || "", role: member.role, page: page || "", lastSeenAt: now },
      $setOnInsert: { firstSeenAt: now }
    },
    { upsert: true }
  );
  return { ok: true, seenAt: now.toISOString() };
});
