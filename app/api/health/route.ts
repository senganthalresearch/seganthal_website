import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, revision: process.env.RENDER_GIT_COMMIT || null }, { headers: { "Cache-Control": "no-store" } });
}
