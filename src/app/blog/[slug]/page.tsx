// @polsia:user-owned — dynamic blog post page (MD-driven). Reads the matching
// `.md` from src/content/posts/ at build time, renders the body via a small
// safe renderer, and emits per-page OG/Twitter metadata + a BlogPosting
// JSON-LD block. Missing slugs hit notFound(); the route stays statically
// generated because getPost only reads files (no `await prisma`, no fetch).

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getAllPosts, getPost, getPostSlugs, renderMarkdown } from '@/lib/business/blog';
import { siteName, siteUrl } from '@/lib/site';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    return { title: 'Post not found' };
  }
  const titleAndSite = `${post.title} — ${siteName}`;
  const canonical = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description || post.title,
    alternates: { canonical },
    openGraph: {
      title: titleAndSite,
      description: post.description || post.title,
      url: `${siteUrl}${canonical}`,
      images: ['/opengraph-image.png'],
      type: 'article',
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: titleAndSite,
      description: post.description || post.title,
      images: ['/opengraph-image.png'],
    },
  };
}

function isoDate(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const canonical = `/blog/${post.slug}`;
  const datePublished = isoDate(post.pubDate);
  const postSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description || post.title,
    ...(datePublished ? { datePublished } : {}),
    ...(datePublished ? { dateModified: datePublished } : {}),
    url: `${siteUrl}${canonical}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}${canonical}` },
    author: { '@type': 'Organization', name: siteName },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/icon.svg` },
    },
    image: { '@type': 'ImageObject', url: `${siteUrl}/opengraph-image.png` },
  };

  const allPosts = getAllPosts();
  const more = allPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <main className="container-page py-section">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-authored literal JSON; not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema) }}
      />

      <article className="mx-auto max-w-2xl">
        <p className="text-eyebrow mb-4">Insights · Proposal Craft</p>
        <h1 className="mb-4 text-h1">{post.title}</h1>
        {post.description ? (
          <p className="text-body-lg text-muted-foreground mb-12">{post.description}</p>
        ) : null}

        <div
          className="blog-body"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered from checked-in MD file, output is HTML-escaped.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
        />

        <div className="mt-12 border-t border-border pt-8">
          <Button asChild variant="link" className="px-0">
            <Link href="/blog">← Back to Blog</Link>
          </Button>
        </div>

        {more.length > 0 ? (
          <section className="mt-16" aria-label="More posts">
            <h2 className="text-h3 mb-6">More posts</h2>
            <ul className="space-y-4">
              {more.map((p) => (
                <li key={p.slug}>
                  <Button asChild variant="link" className="px-0">
                    <Link href={`/blog/${p.slug}`}>{p.title} →</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
