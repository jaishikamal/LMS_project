import "dotenv/config";
import crypto from "crypto";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const SOCKET_SECRET = process.env.AUTH_SECRET ?? process.env.SOCKET_SECRET;

type Identity = { userId: string; role: string };

/**
 * Verifies the HMAC-signed token issued by /api/socket-token. Returns the
 * user identity, or null when the token is missing/invalid/expired.
 */
const verifySocketToken = (token: unknown): Identity | null => {
  if (!SOCKET_SECRET || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", SOCKET_SECRET)
    .update(payload)
    .digest("hex");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof data.userId !== "string" ||
      typeof data.role !== "string" ||
      typeof data.exp !== "number" ||
      data.exp < Date.now()
    ) {
      return null;
    }
    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
};

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  io.use((socket, nextFn) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
    const identity = verifySocketToken(token);
    if (!identity) return nextFn(new Error("Unauthorized"));
    socket.data.userId = identity.userId;
    socket.data.role = identity.role;
    nextFn();
  });

  io.on("connection", (socket) => {
    const { userId } = socket.data;
    socket.join(`user:${userId}`);

    // Real-time delivery: relay a sent message to the recipient's room. The
    // message itself is already persisted by the sendMessage server action;
    // the full payload lets the recipient's open tab show it with no reload.
    socket.on("message:send", (payload: unknown) => {
      const data = payload as {
        recipientId?: unknown;
        id?: unknown;
        senderId?: unknown;
        senderRole?: unknown;
        senderName?: unknown;
        subject?: unknown;
        body?: unknown;
        sentAt?: unknown;
      };
      if (typeof data?.recipientId !== "string") return;
      io.to(`user:${data.recipientId}`).emit("message:new", {
        id: typeof data.id === "number" ? data.id : null,
        senderId: typeof data.senderId === "string" ? data.senderId : "",
        senderRole: typeof data.senderRole === "string" ? data.senderRole : "",
        senderName:
          typeof data.senderName === "string" ? data.senderName : "",
        subject: typeof data.subject === "string" ? data.subject : "",
        body: typeof data.body === "string" ? data.body : "",
        sentAt: typeof data.sentAt === "string" ? data.sentAt : "",
      });
    });

    // Real-time read receipts: notify the sender that the recipient opened
    // their message.
    socket.on("message:read", (payload: unknown) => {
      const data = payload as { senderId?: unknown; id?: unknown };
      if (typeof data?.senderId !== "string") return;
      io.to(`user:${data.senderId}`).emit("message:read", {
        id: typeof data.id === "number" ? data.id : null,
      });
    });

    socket.on("disconnect", () => {
      socket.leave(`user:${userId}`);
    });
  });

  server.listen(port, hostname, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${dev ? "development" : process.env.NODE_ENV}`
    );
  });
});
