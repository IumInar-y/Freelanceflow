// Minimal chrome API surface used by the extension. Avoids pulling in the
// full @types/chrome package for a single tabs.query call.
interface ChromeLike {
  tabs?: {
    query: (info: { active: boolean; currentWindow: boolean }) => Promise<
      Array<{ url?: string }>
    >;
  };
}

declare const chrome: ChromeLike | undefined;
