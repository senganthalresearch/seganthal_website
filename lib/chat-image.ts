import { z } from "zod";

export const maxChatImageBytes = 350_000;
export const chatImageSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(16).max(470_000).regex(/^[A-Za-z0-9+/]+={0,2}$/)
});

export function decodeChatImage(image: z.infer<typeof chatImageSchema>) {
  const bytes = Buffer.from(image.data, "base64");
  if (bytes.length > maxChatImageBytes || bytes.length === 0) return null;
  const jpeg = image.mimeType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = image.mimeType === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = image.mimeType === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return jpeg || png || webp ? bytes : null;
}
