'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { SubscriptionStatusResponse } from '@/lib/contracts/subscription';

const CACHE_KEY = 'ffai_pro_status';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedStatus {
  isPro: boolean;
  plan: string | null;
  cachedAt: number;
}

export function useSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage cache first to avoid a round-trip on every render
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedStatus = JSON.parse(raw);
        if (Date.now() - cached.cachedAt < CACHE_TTL_MS) {
          setIsPro(cached.isPro);
          setPlan(cached.plan);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    // Build the URL — include email query param as fallback for users who
    // haven't created an account yet but entered their email in the tracker gate.
    const email = localStorage.getItem('ffai_email');
    const url = email
      ? `/api/subscription/status?email=${encodeURIComponent(email)}`
      : '/api/subscription/status';

    apiFetch(url, { schema: SubscriptionStatusResponse })
      .then((data) => {
        setIsPro(data.isPro);
        setPlan(data.plan);
        try {
          const cache: CachedStatus = { isPro: data.isPro, plan: data.plan, cachedAt: Date.now() };
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => {
        // Network error — default to free tier; don't block the UI
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { isPro, plan, loading };
}
