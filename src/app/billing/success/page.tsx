import { Suspense } from 'react';
import BillingSuccessClient from './billing-success-client';

export const metadata = {
  title: 'Payment confirmed — FreelanceFlow AI',
  description: 'Confirming your FreelanceFlow AI subscription.',
};

function BillingSuccessFallback() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-section">
      <div className="mx-auto max-w-md text-center">
        <p className="text-muted-foreground">Confirming your payment…</p>
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<BillingSuccessFallback />}>
      <BillingSuccessClient />
    </Suspense>
  );
}
