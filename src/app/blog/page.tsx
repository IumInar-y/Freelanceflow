// @polsia:user-owned — blog index, MD-driven. Lists every .md under
// src/content/posts/ sorted by pubDate desc. No data fetch, no client island;
// the page is fully static via the `node:fs` module imported by the helper.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getAllPosts } from '@/lib/business/blog';
import { siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Notes on writing proposals that get read, scoring drafts against what clients actually want, and using AI without sounding like everyone else.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: `Blog — ${siteName}`,
    description:
      'Notes on writing proposals that get read, scoring drafts against what clients actually want, and using AI without sounding like everyone else.',
    images: ['/opengraph-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Blog — ${siteName}`,
    description:
      'Notes on writing proposals that get read, scoring drafts against what clients actually want, and using AI without sounding like everyone else.',
    images: ['/opengraph-image.png'],
  },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="container-page py-section">
      <div className="mx-auto max-w-2xl">
        <p className="text-eyebrow mb-4">Insights</p>
        <h1 className="text-h1 mb-4">Blog</h1>
        <p className="text-body-lg text-muted-foreground mb-12">
          Short, opinionated notes on proposal craft, voice-matched rewrites, and the clients worth
          winning. We post rarely and only when there is something specific to say.
        </p>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet — check back soon.</p>
        ) : (
          <section className="space-y-8">
            {posts.map((post) => (
              <article key={post.slug} className="rounded-xl border border-border bg-card p-6">
                {post.pubDate ? (
                  <p className="text-eyebrow mb-2 text-muted-foreground">
                    {formatDate(post.pubDate)}
                  </p>
                ) : null}
                <h2 className="text-h3 mb-3">{post.title}</h2>
                {post.description ? (
                  <p className="mb-5 text-sm text-muted-foreground">{post.description}</p>
                ) : null}
                <Button asChild variant="link" className="px-0">
                  <Link href={`/blog/${post.slug}`}>Read the post →</Link>
                </Button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
