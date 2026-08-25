import type { Metadata } from 'next';
import { StripeStatusDashboard } from '@/components/custom/admin/stripe-status-dashboard';
import { requireAdmin } from '@/lib/admin-guard';

export const metadata: Metadata = { title: 'Stripe status' };

export default async function StripeStatusPage() {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-h2 font-bold text-foreground">Stripe readiness</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirms the Stripe env vars needed for checkout are populated in the deployed
          environment, and shows when the subscription-events-drain cron last completed a cycle.
        </p>
      </div>
      <StripeStatusDashboard />
    </main>
  );
}
