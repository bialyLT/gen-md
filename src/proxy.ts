import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isPublic) {
    return NextResponse.next();
  }

  const authUrl = process.env.AUTH_URL;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: authUrl
      ? authUrl.startsWith("https://")
      : request.nextUrl.protocol === "https:",
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", token.id as string);
  response.headers.set("x-user-plan", token.plan as string);
  return response;
}

export const config = {
  matcher: [
    /*
     * Protege todas las rutas excepto:
     * - / (landing)
     * - /login, /register
     * - /api (se protegen individualmente en cada route handler)
     * - archivos estáticos y de metadata
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|register).*)",
  ],
};