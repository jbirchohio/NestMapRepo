import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import helmet from "helmet";

/**
 * Generates a per-request nonce, attaches it to res.locals.cspNonce
 * and adds a strict Content-Security-Policy header with that nonce.
 *
 * The nonce can then be used by server-rendered HTML templates or
 * React streaming output if desired:
 *   <script nonce={res.locals.cspNonce}>…</script>
 */
export function cspMiddleware(req: Request, res: Response, next: NextFunction): void {
  const nonce = Buffer.from(crypto.randomBytes(16)).toString("base64");
  // Expose the nonce for later use in views or other middleware
  (res.locals as any).cspNonce = nonce;

  // Apply Helmet CSP with our custom policy. We turn off `unsafe-inline`.
  // Allow Mapbox scripts/styles plus self.
  const scriptSrc = ["'self'", `"nonce-${nonce}"`, "https://api.mapbox.com", "https://cdnjs.cloudflare.com"];
  const styleSrc = ["'self'", "https://api.mapbox.com", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"];
  const connectSrc = ["'self'", "https://api.mapbox.com", "https://events.mapbox.com"];

  return helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "script-src": scriptSrc,
      "style-src": styleSrc,
      "connect-src": connectSrc,
      "img-src": ["'self'", "data:", "https://api.mapbox.com"],
      "object-src": ["'none'"],
    },
  })(req, res, next);
}
