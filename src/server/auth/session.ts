import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { randomToken, sha256 } from "@/server/crypto";
import { db, schema } from "@/server/db";
import type { User } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { requestMeta } from "@/server/request";

const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function cookieName(): string {
  return serverEnv().NODE_ENV === "production" ? "__Host-wce_session" : "wce_session";
}

async function writeCookie(token: string, expires: Date): Promise<void> {
  const store = await cookies();
  store.set(cookieName(), token, {
    httpOnly: true,
    secure: serverEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  const { ipAddress, userAgent } = await requestMeta();
  await db().insert(schema.sessions).values({ userId, tokenHash: sha256(token), expiresAt, ipAddress, userAgent });
  await writeCookie(token, expiresAt);
}

export async function readSessionUser(): Promise<User | null> {
  await connection();
  const store = await cookies();
  const token = store.get(cookieName())?.value;
  if (!token) {
    return null;
  }

  const [row] = await db()
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, sql`now()`)))
    .limit(1);

  if (!row || row.user.status !== "active") {
    return null;
  }

  const now = Date.now();
  if (now - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const renew = row.session.expiresAt.getTime() - now < RENEW_WHEN_DAYS_LEFT * DAY_MS;
    await db()
      .update(schema.sessions)
      .set(renew ? { lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_DAYS * DAY_MS) } : { lastSeenAt: new Date(now) })
      .where(eq(schema.sessions.id, row.session.id));
  }

  return row.user;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(cookieName())?.value;
  if (token) {
    await db().delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  }
  store.delete(cookieName());
}

export async function destroyAllSessionsFor(userId: string): Promise<void> {
  await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
