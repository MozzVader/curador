import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const total = await db.blogEntry.count();
  const posts = await db.blogEntry.count({ where: { entryType: 'POST' } });
  const pages = await db.blogEntry.count({ where: { entryType: 'PAGE' } });
  const drafts = await db.blogEntry.count({ where: { entryType: 'DRAFT' } });
  const comments = await db.blogEntry.count({ where: { entryType: 'COMMENT' } });
  const approved = await db.blogEntry.count({ where: { status: 'approved' } });
  const pending = await db.blogEntry.count({ where: { status: 'pending' } });
  const discarded = await db.blogEntry.count({ where: { status: 'discarded' } });
  const needsEditing = await db.blogEntry.count({ where: { status: 'needs_editing' } });

  // Only count issues for non-comments (posts, pages, drafts)
  const entriesWithIssues = await db.blogEntry.findMany({
    where: {
      entryType: { not: 'COMMENT' },
      issues: { not: '[]' },
    },
    select: { issues: true },
  });
  const withIssues = entriesWithIssues.length;

  // Count specific issue types (non-comments only)
  let deadImages = 0;
  let flashEmbeds = 0;
  let noTitle = 0;
  let emptyOrShort = 0;
  for (const entry of entriesWithIssues) {
    try {
      const issues = JSON.parse(entry.issues) as { type: string; count?: number }[];
      for (const issue of issues) {
        const c = issue.count || 1;
        switch (issue.type) {
          case 'dead_image_host': deadImages += c; break;
          case 'flash_embed': flashEmbeds += c; break;
          case 'no_title': noTitle += c; break;
          case 'empty_content': case 'short_content': emptyOrShort += c; break;
        }
      }
    } catch { /* ignore */ }
  }

  const totalWords = (await db.blogEntry.aggregate({
    where: { entryType: { not: 'COMMENT' } },
    _sum: { wordCount: true },
  }))._sum.wordCount || 0;

  // Get all unique labels (non-comments only)
  const allEntries = await db.blogEntry.findMany({
    where: { entryType: { not: 'COMMENT' } },
    select: { labels: true },
  });
  const labelSet = new Set<string>();
  for (const entry of allEntries) {
    try {
      const labels = JSON.parse(entry.labels) as string[];
      labels.forEach(l => labelSet.add(l));
    } catch { /* ignore */ }
  }
  const labels = Array.from(labelSet).sort();

  return NextResponse.json({
    total,
    posts,
    pages,
    drafts,
    comments,
    approved,
    pending,
    discarded,
    needsEditing,
    withIssues,
    totalWords,
    labels,
    issueBreakdown: { deadImages, flashEmbeds, noTitle, emptyOrShort },
  });
}