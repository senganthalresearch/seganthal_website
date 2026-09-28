import { db } from "@/lib/db";
import { HttpError, requireMember } from "@/lib/http";

export const GET = async (request: Request) => {
  try {
    await requireMember();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) throw new HttpError(400, "Invalid image reference.");
    const image = await (await db()).collection<{ imageData?: string; imageType?: string }>("messages")
      .findOne({ imageId: id }, { projection: { imageData: 1, imageType: 1 } });
    if (!image?.imageData || !image.imageType) throw new HttpError(404, "Image unavailable.");
    return new Response(new Uint8Array(Buffer.from(image.imageData, "base64")), {
      headers: { "Content-Type": image.imageType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 503;
    return Response.json({ error: error instanceof HttpError ? error.message : "Image unavailable." }, { status });
  }
};
