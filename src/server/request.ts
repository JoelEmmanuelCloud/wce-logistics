import "server-only";
import { isIP } from "node:net";
import { headers } from "next/headers";

export type RequestMeta = { ipAddress: string | null; userAgent: string | null };

export async function requestMeta(): Promise<RequestMeta> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || list.get("x-real-ip")?.trim() || null;
  const userAgent = list.get("user-agent");
  return {
    ipAddress: candidate && isIP(candidate) ? candidate : null,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  };
}
