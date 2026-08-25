// @polsia:user-owned — dedicated /pricing comparison page. Server Component:
// static layout + metadata + inline JSON-LD. No DB or auth reads.

import type { Metadata } from 'next';
import { DashboardCard } from '@/components/custom/dashboard/dashboard-card';
import { ProCheckoutButton } from '@/components/custom/pro-checkout-button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: {
    absolute: 'FreelanceFlow Pro — Tailored Upwork proposals in your voice',
  },
  description:
    'Compare FreelanceFlow Free vs Pro: unlimited rows, platform breakdown, advanced analytics, voice-tailored rewrites, and saved Upwork jobs.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'FreelanceFlow Pro — Tailored Upwork proposals in your voice',
    description: 'Compare FreelanceFlow Free vs Pro.',
    images: ['/opengraph-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreelanceFlow Pro — Tailored Upwork proposals in your voice',
    description: 'Compare FreelanceFlow Free vs Pro.',
    images: ['/opengraph-image.png'],
  },
};

const FAQ_TITLE = 'Common questions';

const faqItems: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Pro is month-to-month. Cancel from your profile and you keep Pro features through the end of the current billing period, then drop back to Free without losing your Tracker data.',
  },
  {
    question: 'Does my data export?',
    answer:
      'Yes. Free keeps your last 10 rows. Pro unlocks one-click CSV export of your full proposal history with date, client, platform, status, and value columns.',
  },
  {
    question: 'What changes on the Tracker?',
    answer:
      'Pro unlocks unlimited rows (instead of 10), platform breakdown, advanced analytics (earnings trend, win rate over time), and voice-tailored rewrites that match your saved jobs.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'No formal trial — Free is the trial. The Tracker, Scanner, and a limited rewrite quota are free forever; upgrade the moment you need unlimited rows or voice-tailored rewrites.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
} as const;

interface CompareRow {
  feature: string;
  free: string;
  pro: string;
}

const compareRows: ReadonlyArray<CompareRow> = [
  {
    feature: 'Unlimited rows',
    free: 'Last 10 rows kept',
    pro: 'Full history, unlimited',
  },
  {
    feature: 'Platform breakdown',
    free: 'Single platform only',
    pro: 'Upwork, Contra, Freelancer.com + custom',
  },
  {
    feature: 'Advanced analytics',
    free: 'Basic counts',
    pro: 'Earnings trend, win rate over time',
  },
  {
    feature: 'Voice-tailored rewrites',
    free: 'Limited rewrites per month',
    pro: 'Unlimited, matched to your tone',
  },
  {
    feature: 'Saved Upwork jobs',
    free: 'Manual list',
    pro: 'Auto-matched to your saved filters',
  },
];

export default function PricingPage() {
  return (
    <main className="flex flex-col">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-authored literal JSON; not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="relative overflow-hidden py-section-lg">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--brand-200)_20%,transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--brand-900)_20%,transparent_70%)]" />
        <div className="container-page relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow mb-3">Pricing</p>
            <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] font-bold leading-[1.05] tracking-tight text-foreground">
              FreelanceFlow Pro
              <br />
              <span className="text-primary">Tailored Upwork proposals in your voice.</span>
            </h1>
            <p className="mt-5 text-[clamp(1rem,2vw,1.15rem)] leading-relaxed text-muted-foreground">
              Free is the trial. Pro unlocks unlimited rows, platform breakdowns, advanced
              analytics, and voice-tailored rewrites that sound like you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-section-lg">
        <div className="container-page">
          <div className="mx-auto max-w-3xl">
            <DashboardCard
              title="What you get"
              description="A side-by-side look at what's included on Free vs Pro."
            >
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span aria-hidden="true" />
                <span className="text-right">Free</span>
                <span className="text-right">Pro</span>
              </div>
            </DashboardCard>

            <div className="mt-4 flex flex-col gap-4">
              {compareRows.map((row) => (
                <DashboardCard
                  key={row.feature}
                  title={row.feature}
                  description={`${row.free} on Free. ${row.pro} on Pro.`}
                  action={
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{row.free}</Badge>
                      <Badge variant="default">
                        <span aria-hidden="true">✓</span> {row.pro}
                      </Badge>
                    </div>
                  }
                >
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Free:</span> {row.free}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Pro:</span> {row.pro}
                    </p>
                  </div>
                </DashboardCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-muted/30">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <p className="text-eyebrow mb-3">FAQ</p>
              <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
                {FAQ_TITLE}
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="py-section-lg">
        <div className="container-page">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold leading-tight tracking-tight text-foreground">
              Ready to sound like you, at scale?
            </h2>
            <p className="text-[clamp(1rem,2vw,1.1rem)] leading-relaxed text-muted-foreground">
              Upgrade in under a minute. Stripe handles the rest.
            </p>
            <div className="mt-2">
              <ProCheckoutButton plan="pro" />
            </div>
            <p className="text-xs text-muted-foreground">$59/month · cancel anytime</p>
          </div>
        </div>
      </section>
    </main>
  );
}
