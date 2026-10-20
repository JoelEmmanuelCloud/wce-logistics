import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["__Host-wce_session", "wce_session"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
  if (hasSession) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/vendor/:path*", "/account/:path*", "/admin/:path*", "/onboarding"],
};
