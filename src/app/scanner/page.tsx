// @polsia:user-owned — dedicated landing for the Proposal Quality Scanner.
// Edit freely: this is an unmatched app route (unmatched ⇒ user_owned).

import type { Metadata } from 'next';
import { ProposalScanner } from '@/components/scanner/proposal-scanner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata: Metadata = {
  title: 'Proposal Quality Scanner',
  description:
    'Score your freelance proposals in seconds. AI rewrite, instant scoring, and the Pro plan for unlimited rewrites.',
  alternates: { canonical: '/scanner' },
  openGraph: {
    title: 'Proposal Quality Scanner — FreelanceFlow AI',
    description:
      'Score and rewrite your freelance proposals in seconds. AI-tailored rewrites, instant scoring, and a Pro plan for unlimited use.',
    images: ['/opengraph-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Proposal Quality Scanner — FreelanceFlow AI',
    description: 'Score and rewrite your freelance proposals in seconds.',
    images: ['/opengraph-image.png'],
  },
};

const faqItems: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'How does the Proposal Quality Scanner score my proposal?',
    answer:
      'It runs your draft through a rubric tuned for freelance proposals — clarity, scope fit, value framing, call-to-action, and platform-compliance signals — and returns a 0–100 score plus per-axis tips you can act on in one pass.',
  },
  {
    question: 'Can the AI rewrite my proposal for me?',
    answer:
      'Yes. Hit "Rewrite with AI" to get a tailored rewrite that matches the job listing, your skills, and your tone. The free tier includes limited rewrites per month; Pro unlocks unlimited rewrites.',
  },
  {
    question: 'What does the Pro tier include?',
    answer:
      'Pro ($59/month) gives you unlimited AI rewrites, three platform connections, advanced analytics, and priority support — built for established freelancers ready to scale.',
  },
  {
    question: 'Is my proposal text used to train AI models?',
    answer:
      'No. Your proposal text is processed only to generate your score and (if you ask) your rewrite, then discarded. We never sell or share your drafts and you can delete your scan history at any time.',
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

export default function ScannerPage() {
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
            <p className="text-eyebrow mb-3">Proposal Quality Scanner</p>
            <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] font-bold leading-[1.05] tracking-tight text-foreground">
              Score your proposal
              <br />
              <span className="text-primary">in seconds.</span>
            </h1>
            <p className="mt-5 text-[clamp(1rem,2vw,1.15rem)] leading-relaxed text-muted-foreground">
              Paste any freelance proposal and get an instant 0–100 score, per-axis tips, and an AI
              rewrite tailored to the job listing.
            </p>
          </div>
        </div>
      </section>

      <section className="py-section-lg">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <ProposalScanner />
          </div>
        </div>
      </section>

      <section className="section bg-muted/30">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <p className="text-eyebrow mb-3">FAQ</p>
              <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
                Common questions
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
    </main>
  );
}
