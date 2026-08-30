import { NextResponse } from "next/server";
import { getMessages, clearSessionMessages } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const messages = getMessages(sessionId);
  return NextResponse.json({ messages });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  clearSessionMessages(sessionId);
  return NextResponse.json({ success: true });
}