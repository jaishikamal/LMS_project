import { auth } from "@/auth";
import crypto from "crypto";
import { NextResponse } from "next/server";

const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Issues a short-lived, HMAC-signed token for the Socket.IO handshake. The
 * token only proves "this browser has a valid session" — it carries the
 * user id + role and is verified by the socket server before the socket is
 * accepted.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET ?? process.env.SOCKET_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Socket auth is not configured" },
      { status: 500 }
    );
  }

  const payload = Buffer.from(
    JSON.stringify({ userId, role, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return NextResponse.json({ token: `${payload}.${signature}` });
}
