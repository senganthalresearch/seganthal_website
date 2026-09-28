import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { api, requireMember, requirePermission, checkOrigin, limited, HttpError } from "@/lib/http";
import { chatImageSchema, decodeChatImage } from "@/lib/chat-image";
export const GET = api(async () => {
  await requireMember();
  const docs = await (await db()).collection("messages").find({}, { projection: { email: 0, imageData: 0, imageType: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
  return { messages: docs.reverse().map(({ _id, ...doc }) => ({ ...doc, id: String(_id) })) };
});
export const POST = api(async request => {
  checkOrigin(request); const member = await requirePermission("chat"); await limited(member, "chat", 15);
  const { text, image } = z.object({ text: z.string().trim().max(2000), image: chatImageSchema.optional() })
    .refine(value => Boolean(value.text || value.image)).parse(await request.json());
  const bytes = image ? decodeChatImage(image) : null;
  if (image && !bytes) throw new HttpError(400, "Choose a PNG, JPEG or WebP image under 350 KB.");
  await (await db()).collection("messages").insertOne({
    text, email: member.email, name: member.name || "Team member", createdAt: new Date().toISOString(),
    ...(image ? { imageId: randomUUID(), imageType: image.mimeType, imageData: bytes!.toString("base64") } : {})
  });
  return { ok: true };
});

