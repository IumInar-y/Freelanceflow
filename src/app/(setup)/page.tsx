// @polsia:user-owned — starter home served at /. Replace it in place, or delete
// this route group before adding another page that resolves to /.

import { Award, Lock, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { ProCheckoutButton } from '@/components/custom/pro-checkout-button';
import { ProposalScanner } from '@/components/scanner/proposal-scanner';
import { ProposalTracker } from '@/components/tracker/proposal-tracker';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteDescription, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: siteName },
  description: siteDescription,
  alternates: { canonical: '/' },
};

function CheckIcon() {
  return (
    <svg
      className="size-5 shrink-0 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* ── HERO ── asymmetric split layout ─────────────────────────── */}
      <section className="relative overflow-hidden py-section-lg">
        {/* Background texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--brand-200)_20%,transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--brand-900)_20%,transparent_70%)]" />
        <div className="container-page">
          {/* Centered text */}
          <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
            <Badge
              variant="secondary"
              className="mb-5 inline-flex animate-[slide-down_0.4s_ease-out]"
            >
              Chrome Extension — Early Access
            </Badge>
            <h1 className="font-display text-[clamp(2.4rem,5vw,3.8rem)] font-bold leading-[1.05] tracking-tight text-foreground animate-[fade-up_0.5s_ease-out_0.1s_both]">
              Stop chasing.
              <br />
              <span className="text-primary">Start doing.</span>
            </h1>
            <p className="mt-5 text-[clamp(1rem,2vw,1.2rem)] leading-relaxed text-muted-foreground animate-[fade-up_0.5s_ease-out_0.2s_both]">
              FreelanceFlow AI automates your entire client lifecycle — from finding opportunities
              and winning work, to onboarding and getting paid. All from a single Chrome extension.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-[fade-up_0.5s_ease-out_0.3s_both]">
              <Button size="lg" asChild className="animate-cta-pulse">
                <a href="#proposal-scanner">
                  Try It Free
                  <ArrowIcon />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/#features">See How It Works</a>
              </Button>
            </div>
            {/* Social proof */}
            <p className="mt-6 text-sm text-muted-foreground animate-[fade-up_0.5s_ease-out_0.4s_both]">
              Trusted by <span className="font-semibold text-foreground">1,200+</span> independent
              freelancers worldwide
            </p>
          </div>
        </div>
      </section>

      {/* ── PROPOSAL SCANNER ── email-gated tool widget ─────────────────── */}
      <section id="proposal-scanner" className="py-section-lg">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <ProposalScanner />
          </div>
        </div>
      </section>

      {/* ── PROPOSAL TRACKER ── log and track your sent proposals ──────── */}
      <section className="py-section-lg bg-muted/30">
        <div className="container-page">
          <div className="mx-auto max-w-4xl">
            <ProposalTracker />
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── alternating grid, not centered icon cards ──── */}
      <section id="features" className="section bg-muted/30">
        <div className="container-page">
          <div className="mb-12 max-w-2xl">
            <p className="text-eyebrow mb-3">What FreelanceFlow AI Does</p>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
              Your full client lifecycle, automated
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From first bid to final payment — FreelanceFlow AI handles every step so you can focus
              entirely on delivery.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Real-Time Job Monitoring
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Continuously scans multiple job boards and surfaces only the opportunities that
                match your skills and preferences — no more endless scrolling.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                AI-Tailored Proposals
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Generates bespoke proposals for each opportunity using your history and the
                client&apos;s specific needs — then runs a compliance check before human review.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Automated Onboarding
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sends contracts, collects e-signatures, gathers project assets, and sets up
                communication channels — so you&apos;re ready to work the moment a project starts.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Weekly Revenue Digest
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Every Monday morning, receive a concise summary: earnings, active projects, pending
                invoices, and pipeline health — all in under 60 seconds.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Platform Integration
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Runs as a Chrome extension, integrating directly with your existing profiles on
                major freelance platforms — no new tools to juggle.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">
                Terms of Service Compliance
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Every AI-generated proposal is flagged for human review before submission — keeping
                you compliant with platform rules while still moving fast.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── numbered steps, offset layout ─────────────── */}
      <section id="how-it-works" className="section">
        <div className="container-page">
          <div className="mb-14 text-center">
            <p className="text-eyebrow mb-3">The Process</p>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
              Up and running in three steps
            </h2>
          </div>

          <div className="relative grid gap-12 md:grid-cols-3">
            {/* Connecting line */}
            <div className="absolute left-1/2 top-8 hidden h-0.5 w-2/3 -translate-x-1/2 bg-border md:block" />

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                <span className="font-display text-xl font-bold">1</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Connect Your Profiles
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Install the Chrome extension and link your existing freelance platform accounts.
                FreelanceFlow AI learns your skills, rates, and preferences.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                <span className="font-display text-xl font-bold">2</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                AI Finds & Filters Opportunities
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The platform continuously monitors job boards, scores each opportunity against your
                profile, and generates tailored proposals — ready for your review in seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="relative z-10 mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                <span className="font-display text-xl font-bold">3</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Win Work, Get Paid
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Submit via the extension after human review. FreelanceFlow AI automates onboarding,
                tracks invoices, and sends your weekly revenue digest — every Monday.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" asChild>
              <a href="mailto:hello@freelanceflow.ai?subject=Early%20Access%20Request">
                Start Your Free Trial
                <ArrowIcon />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── PROOF / STATS ── full-width dark band ─────────────────────── */}
      <section className="relative overflow-hidden py-section">
        <div className="absolute inset-0 bg-foreground" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,var(--brand-700)_0%,transparent_70%)] opacity-20" />
        <div className="container-page relative z-10">
          <div className="grid gap-8 text-center md:grid-cols-3">
            <div>
              <p className="font-display text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight text-background">
                70%
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                reduction in time spent on business development
              </p>
            </div>
            <div>
              <p className="font-display text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight text-background">
                3×
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                increase in proposal volume vs manual submission
              </p>
            </div>
            <div>
              <p className="font-display text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight text-background">
                40%
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                higher conversion rate on AI-assisted proposals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── card grid ───────────────────────────────────────── */}
      <section id="pricing" className="section bg-muted/30">
        <div className="container-page">
          <div className="mb-12 text-center">
            <p className="text-eyebrow mb-3">Pricing</p>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No hidden fees. No per-proposal charges. Just one subscription for your entire client
              lifecycle.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Solo */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="font-display text-xl">Solo</CardTitle>
                <CardDescription className="mt-1">
                  For independent freelancers just getting started
                </CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    '1 platform connection',
                    '50 AI proposals/month',
                    'Automated onboarding',
                    'Weekly revenue digest',
                    'Standard support',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <ProCheckoutButton plan="solo" className="mt-6 w-full" />
              </CardContent>
            </Card>

            {/* Pro — highlighted */}
            <Card className="relative border-primary shadow-md">
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-primary" />
              <CardHeader>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5">
                  <span className="text-xs font-semibold text-primary">Most Popular</span>
                </div>
                <CardTitle className="font-display text-xl">Pro</CardTitle>
                <CardDescription className="mt-1">
                  For established freelancers ready to scale
                </CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">$59</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    '3 platform connections',
                    'Unlimited AI proposals',
                    'Automated onboarding',
                    'Weekly revenue digest',
                    'Priority support',
                    'Advanced analytics',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <ProCheckoutButton className="mt-6 w-full" />
              </CardContent>
            </Card>

            {/* Agency */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="font-display text-xl">Agency</CardTitle>
                <CardDescription className="mt-1">
                  For growing teams managing multiple clients
                </CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">$129</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    'Unlimited platform connections',
                    'Unlimited AI proposals',
                    'Automated onboarding',
                    'Weekly revenue digest',
                    'Dedicated account manager',
                    'Team collaboration',
                    'Custom integrations',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <a href="mailto:hello@freelanceflow.ai?subject=Agency%20Plan%20Inquiry">
                    Contact Sales
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── testimonials + trust badges ─────────────── */}
      <section id="trust" className="section">
        <div className="container-page">
          <div className="mb-12 text-center">
            <p className="text-eyebrow mb-3">Trusted by freelancers</p>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
              <span className="text-primary">1,200+</span> teams trust FreelanceFlow AI
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Hear from freelancers who have reclaimed their time and grown their revenue.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Testimonial 1 */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;FreelanceFlow AI cut my proposal writing from 30 minutes to 3. I tripled my
                  output and finally feel like I&apos;m running a business, not chasing one.&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    MR
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Maya Reyes</p>
                    <p className="text-xs text-muted-foreground">Brand designer · Pro plan</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 2 */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;Onboarding used to be the worst part of any new project. Contracts, briefs,
                  kickoffs — all handled before I even open the doc. My week back is unreal.&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    JC
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Jordan Chen</p>
                    <p className="text-xs text-muted-foreground">
                      Full-stack developer · Agency plan
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 3 */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;I was skeptical about AI proposals, but the compliance review is genuinely
                  the safety net I needed. I send more bids with more confidence.&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    SA
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Sara Adekunle</p>
                    <p className="text-xs text-muted-foreground">Technical writer · Solo plan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Stripe-secured payments
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
              <Lock className="size-3.5" aria-hidden="true" />
              GDPR-ready
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
              <Award className="size-3.5" aria-hidden="true" />
              Encrypted at rest
            </Badge>
          </div>
        </div>
      </section>

      {/* ── FAQ ── accordion, light section ──────────────────────────── */}
      <section className="section">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <p className="text-eyebrow mb-3">FAQ</p>
              <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight tracking-tight text-foreground">
                Common questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="platforms">
                <AccordionTrigger>Which freelance platforms does it support?</AccordionTrigger>
                <AccordionContent>
                  FreelanceFlow AI currently supports Upwork, Fiverr, Toptal, and Freelancer.com,
                  with additional platforms added based on user demand. The Chrome extension works
                  across all of them with a single unified interface.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="compliance">
                <AccordionTrigger>How does the AI ensure platform compliance?</AccordionTrigger>
                <AccordionContent>
                  Every proposal generated by AI goes through a compliance review stage before it
                  can be submitted. FreelanceFlow AI checks your proposal against the specific
                  platform&apos;s terms of service, flags any potential violations, and requires
                  your explicit approval before the submission leaves your browser.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="data">
                <AccordionTrigger>Is my work history and client data secure?</AccordionTrigger>
                <AccordionContent>
                  Absolutely. All data is encrypted in transit and at rest. Your proposals, client
                  information, and work history are never used to train AI models or shared with
                  third parties. You can delete your data at any time from the settings panel.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="billing">
                <AccordionTrigger>Can I change or cancel my plan at any time?</AccordionTrigger>
                <AccordionContent>
                  Yes — you can upgrade, downgrade, or cancel your subscription at any time from
                  your account settings. There are no long-term contracts or cancellation fees. If
                  you cancel, you&apos;ll retain access until the end of your current billing
                  period.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="trial">
                <AccordionTrigger>Is there a free trial?</AccordionTrigger>
                <AccordionContent>
                  Yes, all plans include a 14-day free trial with no credit card required. You get
                  full access to all features for the trial period so you can see the impact on your
                  workflow before committing.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── centered, warm ───────────────────────────────── */}
      <section className="section-lg">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-lg md:px-12">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,var(--brand-300)_0%,transparent_70%)] opacity-40 dark:opacity-20" />
            <div className="relative z-10">
              <Badge variant="secondary" className="mb-4 inline-flex">
                Limited Early Access
              </Badge>
              <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-bold leading-tight tracking-tight text-foreground">
                Ready to stop chasing
                <br />
                and start doing?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
                Join 1,200+ freelancers who have reclaimed their time and grown their revenue with
                FreelanceFlow AI.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <a href="#proposal-scanner">
                    Request Early Access
                    <ArrowIcon />
                  </a>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <a href="/#features">Learn More</a>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Free 14-day trial &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
