import type { Metadata } from 'next';
import { GrantProForm } from '@/components/custom/admin/grant-pro-form';
import { requireAdmin } from '@/lib/admin-guard';

export const metadata: Metadata = { title: 'Grant Pro' };

export default async function GrantProPage() {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-h2 font-bold text-foreground">Grant Pro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manually grant or revoke a Pro subscription for any email. Bypasses Stripe — use this for
          comp activations while checkout is being wired up.
        </p>
      </div>
      <GrantProForm />
    </main>
  );
}
