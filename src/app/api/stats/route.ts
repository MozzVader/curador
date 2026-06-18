import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
  const withIssues = await db.blogEntry.count({
    where: { issues: { not: '[]' } },
  });
  const totalWords = (await db.blogEntry.aggregate({ _sum: { wordCount: true } }))._sum.wordCount || 0;

  // Get all unique labels
  const allEntries = await db.blogEntry.findMany({
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
  });
}