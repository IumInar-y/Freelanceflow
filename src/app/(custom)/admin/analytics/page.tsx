import type { Metadata } from 'next';
import Link from 'next/link';
import { AnalyticsDashboard } from '@/components/custom/admin/analytics-dashboard';
import { requireAdmin } from '@/lib/admin-guard';

export const metadata: Metadata = { title: 'Upsell Analytics' };

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-h2 font-bold text-foreground">Upsell Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pro upgrade clicks, conversions, and revenue.{' '}
          <Link
            href="/admin/grant-pro"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Need to grant Pro manually?
          </Link>
        </p>
      </div>
      <AnalyticsDashboard />
    </main>
  );
}
