// @polsia:user-owned — blog post helpers. Reads MD files from src/content/posts/,
// renders frontmatter as plain text. The data plane rule reads `node:fs`, not a
// data fetch — this stays valid in a Server Component because no Server Action,
// no `await prisma`, no `headers()` read happens here.
//
// The renderer is a deliberately minimal safe-text renderer: enough for a blog
// post (paragraphs, headings, bold, italic, links, lists, code spans + blocks).
// It's hand-written because the brief expects no `react-markdown` install and
// this surface doesn't need it.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  /** ISO date string from frontmatter (`pubDate`). */
  pubDate: string;
  /** Raw markdown body (frontmatter stripped). */
  body: string;
}

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const MD_EXTENSION = /\.md$/;

// ---------- frontmatter ----------------------------------------------------

const FRONTMATTER_DELIM = /^---\s*$/;
const FRONTMATTER_KV = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/;

/** Parsed frontmatter is a flat string→string map. Values are unquoted in the
 * file but stored trimmed; the body is everything after the second `---`. */
export function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const lines = raw.split(/\r?\n/);
  if (lines[0] !== '---' && !FRONTMATTER_DELIM.test(lines[0] ?? '')) {
    return { meta: {}, body: raw };
  }
  const meta: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) break;
    if (FRONTMATTER_DELIM.test(line)) {
      i += 1;
      break;
    }
    const match = FRONTMATTER_KV.exec(line);
    if (!match || !match[1]) continue;
    const key = match[1];
    let value = match[2] ?? '';
    // Strip a single matching pair of straight or curly quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value.trim();
  }
  const body = lines.slice(i).join('\n');
  return { meta, body };
}

// ---------- markdown → safe HTML ------------------------------------------

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

function escapeAttr(url: string): string {
  // Allow http(s), mailto, internal anchors and relative paths. Block javascript:.
  const trimmed = url.trim();
  if (/^javascript:/i.test(trimmed)) return '#';
  return escapeHtml(trimmed);
}

/** Render the raw post body as a small safe subset of HTML. The output is
 * always trusted — `body` comes from a checked-in markdown file in the repo,
 * not from user input — so we keep this minimal but readable. */
export function renderMarkdown(body: string): string {
  const codeBlocks: string[] = [];
  // Extract fenced code blocks first; passed through verbatim to escapeHtml.
  // We stash each block by index in `codeBlocks` and substitute it back in
  // once the rest of the body has been rendered, so the block survives whatever
  // punctuation the renderer emits on neighbouring lines.
  const stripped = body.replace(/```([a-zA-Z0-9_-]*)?\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="my-4 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-sm"><code>${escapeHtml(
        code.replace(/\n$/, ''),
      )}</code></pre>`,
    );
    // Unique non-letter sentinel per index. Generates "polCode0", "polCode1", ...
    return `polCode${idx}pol`;
  });

  const lines = stripped.split('\n');
  const out: string[] = [];
  let listOpen: 'ul' | 'ol' | null = null;

  const inline = (text: string): string => {
    let s = escapeHtml(text);
    // Inline code (must run before bold/italic so we don't replace inside it).
    s = s.replace(
      /`([^`]+)`/g,
      (_m, code) => `<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">${code}</code>`,
    );
    // Links: [label](href)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
      return `<a class="text-primary underline underline-offset-4" href="${escapeAttr(href)}">${label}</a>`;
    });
    // Bold then italic (order matters — italic also matches inside bold).
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return s;
  };

  const closeList = () => {
    if (listOpen) {
      out.push(`</${listOpen}>`);
      listOpen = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line === '') {
      closeList();
      out.push('');
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1]?.length ?? 0;
      const tag =
        level > 0 ? (`h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') : 'h1';
      const size =
        ['text-h1', 'text-h2', 'text-h3', 'text-h4', 'text-h5', 'text-h6'][level - 1] ?? 'text-h4';
      out.push(`<${tag} class="${size} mt-8 mb-4">${inline(heading[2] ?? '')}</${tag}>`);
      continue;
    }
    const olItem = /^\s*\d+\.\s+(.*)$/.exec(line);
    const ulItem = /^\s*[-*]\s+(.*)$/.exec(line);
    if (olItem || ulItem) {
      const want: 'ul' | 'ol' = olItem ? 'ol' : 'ul';
      if (listOpen !== want) {
        closeList();
        out.push(
          `<${want} class="my-4 ml-6 list-${want === 'ol' ? 'decimal' : 'disc'} space-y-2">`,
        );
        listOpen = want;
      }
      const listMatch = olItem ?? ulItem;
      const content = listMatch?.[1] ?? '';
      out.push(`<li>${inline(content)}</li>`);
      continue;
    }
    closeList();
    out.push(`<p class="my-4 text-body leading-relaxed text-muted-foreground">${inline(line)}</p>`);
  }
  closeList();

  // Stitch code blocks back in by walking through `out` and replacing the
  // placeholder occurrences in document order. The replacements sit BETWEEN
  // segments, not inside them, so we operate on the concatenated string.
  const html = out.filter((segment) => segment !== '').join('\n');
  if (codeBlocks.length === 0) return html;
  let result = '';
  let previousEnd = 0;
  for (let idx = 0; idx < codeBlocks.length; idx++) {
    const token = `polCode${idx}pol`;
    const at = html.indexOf(token, previousEnd);
    if (at === -1) continue;
    result += html.slice(previousEnd, at);
    const codeHtml = codeBlocks[idx];
    result += codeHtml ?? '';
    previousEnd = at + token.length;
  }
  result += html.slice(previousEnd);
  return result;
}

// ---------- filesystem helpers --------------------------------------------

function readPostFile(file: string): PostMeta | null {
  const fullPath = join(POSTS_DIR, file);
  if (!existsSync(fullPath)) return null;
  const raw = readFileSync(fullPath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const slug = file.replace(MD_EXTENSION, '');
  const title = meta.title?.trim() || slug;
  const description = (meta.description ?? meta.summary ?? '').trim();
  const pubDate = (meta.pubDate ?? meta.date ?? meta.publishedAt ?? '').trim();
  // Posts with no frontmatter metadata are kept (we still get a slug from the
  // filename) but without `pubDate` they sort last.
  return { slug, title, description, pubDate, body };
}

/** List all posts under `src/content/posts/`, sorted by `pubDate` desc with
 * slug ascending as the tiebreaker. */
export function getAllPosts(): PostMeta[] {
  if (!existsSync(POSTS_DIR)) return [];
  const stat = statSync(POSTS_DIR);
  if (!stat.isDirectory()) return [];
  const files = readdirSync(POSTS_DIR).filter((name) => MD_EXTENSION.test(name));
  const posts = files
    .map((file) => readPostFile(file))
    .filter((post): post is PostMeta => post !== null);
  posts.sort((a, b) => {
    const dateCompare = (b.pubDate || '').localeCompare(a.pubDate || '');
    if (dateCompare !== 0) return dateCompare;
    return a.slug.localeCompare(b.slug);
  });
  return posts;
}

export function getPost(slug: string): PostMeta | null {
  const safe = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  if (safe !== slug || safe.length === 0) return null;
  return readPostFile(`${safe}.md`);
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}
