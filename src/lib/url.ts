/**
 * Devuelve el origen público de la app que ve el navegador del usuario.
 * Respeta los headers de proxy (x-forwarded-proto / x-forwarded-host)
 * para que la URL de retorno de Mercado Pago coincida con el origen donde
 * quedó guardada la cookie de sesión (Secure/__Secure-). Sin proxys, cae
 * al origin del request.
 */
export function appBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim() ?? url.protocol.replace(":", "");
  const host =
    request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim() ??
    request.headers.get("host") ??
    url.host;
  return `${proto}://${host}`;
}