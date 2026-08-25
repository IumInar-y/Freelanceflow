// Subscription events drain — runs every 15 minutes per polsia.toml.
//
// Polsia's payment-events feed is the only inbound path for Stripe lifecycle
// events (the app never receives Stripe callbacks directly); see the
// stripe-billing module's AGENT.md. This script pages through that feed,
// mutates the UserPlan row to match Stripe's reported state, and persists
// the cursor so the next invocation only processes events newer than the
// last successful one.
//
// The plan-threshold mirrors src/app/api/subscription/activate/route.ts:
//   amountUsd >= 50  → 'pro'
//   amountUsd >   0  → 'solo'
//   otherwise        → 'free'

const { PrismaClient } = require('@prisma/client');

const POLSIA_API_BASE_URL = (process.env.POLSIA_API_BASE_URL || 'https://polsia.com').replace(
  /\/+$/,
  '',
);
const POLSIA_API_KEY = process.env.POLSIA_API_KEY || process.env.POLSIA_API_TOKEN;
const POLSIA_OWNER_EMAIL = process.env.POLSIA_OWNER_EMAIL || '';

const PRO_PLAN_THRESHOLD_USD = 50;

if (!POLSIA_API_KEY) {
  process.stderr.write('[subscription-events] POLSIA_API_KEY not set; nothing to drain.\n');
  process.exit(0);
}

function planFromAmount(amountUsd) {
  const n = Number(amountUsd) || 0;
  if (n >= PRO_PLAN_THRESHOLD_USD) return 'pro';
  if (n > 0) return 'solo';
  return 'free';
}

async function listEvents(authKey, sinceCursor) {
  const url = `${POLSIA_API_BASE_URL}/api/v2/app-payments/events?since=${sinceCursor}&limit=100`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${authKey}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`list events failed: ${res.status} ${detail}`.trim());
  }
  const raw = await res.json();
  return {
    events: Array.isArray(raw?.events) ? raw.events : [],
    nextCursor: typeof raw?.next_cursor === 'number' ? raw.next_cursor : sinceCursor,
  };
}

async function handleEvent(prisma, event) {
  if (!event.customer_email) {
    process.stderr.write(`[subscription-events] skip ${event.id} (no customer email)\n`);
    return;
  }
  const email = event.customer_email;
  const type = String(event.type || '');

  switch (type) {
    case 'payment_received':
    case 'invoice.payment_succeeded': {
      const plan = planFromAmount(event.amount_usd);
      await prisma.userPlan.upsert({
        where: { email },
        create: {
          email,
          plan,
          source: 'stripe_checkout',
          active: true,
          activatedAt: new Date(),
        },
        update: {
          plan,
          active: true,
          paymentFailedAt: null,
        },
      });
      return;
    }
    case 'subscription_cancelled':
    case 'customer.subscription.deleted': {
      // Do not delete — preserves cancellation audit trail.
      const plan = planFromAmount(event.amount_usd);
      await prisma.userPlan.upsert({
        where: { email },
        create: {
          email,
          plan,
          source: 'stripe_checkout',
          active: false,
        },
        update: { active: false },
      });
      return;
    }
    case 'subscription_updated':
    case 'customer.subscription.updated': {
      const plan = planFromAmount(event.amount_usd);
      await prisma.userPlan.upsert({
        where: { email },
        create: {
          email,
          plan,
          source: 'stripe_checkout',
          active: true,
        },
        update: { plan },
      });
      return;
    }
    case 'payment_failed':
    case 'invoice.payment_failed': {
      // Stripe retains access during grace period; flip `active` only on
      // a later subscription_cancelled event.
      await prisma.userPlan.upsert({
        where: { email },
        create: {
          email,
          plan: 'free',
          source: 'stripe_checkout',
          active: true,
          paymentFailedAt: new Date(),
        },
        update: { paymentFailedAt: new Date() },
      });
      return;
    }
    default: {
    }
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const cursorRow = await prisma.stripeBillingCursor.findUnique({ where: { id: 1 } });
    let cursor = cursorRow?.cursor ?? 0;
    let _processed = 0;
    const MAX_PAGES = 10;

    for (let page = 0; page < MAX_PAGES; page++) {
      const { events, nextCursor } = await listEvents(POLSIA_API_KEY, cursor);
      if (events.length === 0) break;

      for (const event of events) {
        try {
          await handleEvent(prisma, event);
        } catch (err) {
          // Do NOT advance the cursor — the failed event redelivers next run.
          process.stderr.write(
            `[subscription-events] failed event ${event?.id ?? '?'}: ${err?.message || err}\n`,
          );
          if (POLSIA_OWNER_EMAIL) {
            process.stderr.write(
              `[subscription-events] hint: notify ${POLSIA_OWNER_EMAIL} if this persists\n`,
            );
          }
          await prisma.stripeBillingCursor.upsert({
            where: { id: 1 },
            create: { id: 1, cursor },
            update: { cursor },
          });
          return;
        }
        cursor = event.id;
        _processed += 1;
      }
      // After a fully drained page, jump to the feed's nextCursor anchor so
      // any events appended during processing are still picked up next run.
      cursor = nextCursor;
    }

    await prisma.stripeBillingCursor.upsert({
      where: { id: 1 },
      create: { id: 1, cursor },
      update: { cursor },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  process.stderr.write(`[subscription-events] fatal: ${err?.stack || err}\n`);
  process.exit(1);
});
