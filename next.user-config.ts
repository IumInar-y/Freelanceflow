// @polsia:user-owned — your Next.js customizations, merged into next.config.ts by the
// framework. Edit freely (no slot markers). next.config.ts stays framework-owned: don't
// put security headers / CSP / a full `images` block here.
import type { NextConfig } from 'next';

type RemotePatterns = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>;

/** Per-app extra CSP source allow-lists, consumed by src/lib/csp.ts' `buildCsp`.
 * Each list appends to the matching resource directive (frame/connect/media/font/img).
 * Wildcards and script/style execution escapes are explicitly dropped by `buildCsp`,
 * so this seam can never silently gut script-src or style-src (XSS rampart lives there).
 * Default empty = same-origin only. */
export type CspExtraSources = {
  /** third-party <iframe> hosts (Stripe, YouTube, reCAPTCHA, maps, Calendly). */
  frameSrc?: string[];
  /** fetch/XHR/WebSocket/SSE origins beyond self + NEXT_PUBLIC_API_URL. */
  connectSrc?: string[];
  /** <audio>/<video> hosts loaded cross-origin. */
  mediaSrc?: string[];
  /** web-font hosts (next/font self-hosts, so this is rarely needed). */
  fontSrc?: string[];
  /** image hosts beyond the base `https:` allowance (rare). */
  imgSrc?: string[];
};

/** Per-app browser capabilities, consumed by src/lib/permissions-policy.ts. Each
 * field defaults to FALSE = OFF — the Permissions-Policy header stays locked-down
 * `camera=(), microphone=(), geolocation=(), browsing-topics=()`. Flip a field
 * to `true` to emit `<feature>=(self)` (this origin may request the feature; the
 * browser's native permission prompt is still the real gate). Leave unused
 * capabilities OFF — security audits flag unused device permissions. */
export type AppCapabilities = {
  /** getUserMedia({ audio }), MediaRecorder — voice recording. */
  microphone?: boolean;
  /** getUserMedia({ video }) — video calls, QR scan, photo capture. */
  camera?: boolean;
  /** navigator.geolocation — "near me", maps. */
  geolocation?: boolean;
};

/** Remote hosts you load <Image> from. e.g. { protocol: 'https', hostname: 'images.unsplash.com' } */
export const userRemotePatterns: RemotePatterns = [];

/** Package-level Next options (transpilePackages, experimental.optimizePackageImports, …). */
export const userNextConfig: NextConfig = {};

/** Config plugins (webpack, turbopack, etc.) composed outermost in next.config.ts. */
export const userConfigPlugins: ((config: NextConfig) => NextConfig)[] = [];

/** Per-app CSP source extensions; default empty = same-origin only. */
export const cspExtraSources: CspExtraSources = {};

/** Per-app browser capabilities; default empty = every feature locked-off. */
export const appCapabilities: AppCapabilities = {};
