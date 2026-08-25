// @polsia:user-owned — brand identity. Edit freely. `site.ts` re-exports
// siteName/siteDescription; `manifest.ts` + `opengraph-image.tsx` read `brandVisual`.

export const siteName = 'FreelanceFlow AI';
export const siteDescription =
  'Your autopilot for client acquisition, onboarding, and revenue — all in one.';

// PWA + social-share colors. HEX only (the oklch() tokens in globals.css aren't
// readable here) — set to match your brand seed.
export const brandVisual = {
  /** PWA browser-UI / status-bar color. */
  themeColor: '#e67e22',
  /** PWA splash + install background. */
  backgroundColor: '#0f172a',
  /** Social-share (OG/Twitter) image. */
  og: {
    background: '#0f172a',
    foreground: '#fef3e2',
    /** Second line under the site name; '' hides it. */
    tagline: 'Stop chasing work. Start doing it.',
  },
} as const;
