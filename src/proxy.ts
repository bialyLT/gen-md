import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api"];
const AUTH_PAGES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Rutas realmente públicas (landing y API). Las páginas de auth se
  // evalúan abajo para no dejarlas abrir con una sesión activa.
  if (isPublic && !isAuthPage) {
    return NextResponse.next();
  }

  const authUrl = process.env.AUTH_URL;
  const secret = process.env.AUTH_SECRET;
  const secureCookie = authUrl
    ? authUrl.startsWith("https://")
    : request.nextUrl.protocol === "https:";
  let token = await getToken({ req: request, secret, secureCookie });
  if (!token) {
    token = await getToken({
      req: request,
      secret,
      secureCookie: !secureCookie,
    });
  }

  // Prohibir /login y /register si ya hay una sesión activa.
  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
     * - / (landing, se maneja en el proxy)
     * - /login, /register (se manejan en el proxy para redirigir si hay sesión)
     * - /api (se protegen individualmente en cada route handler)
     * - archivos estáticos y de metadata
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};