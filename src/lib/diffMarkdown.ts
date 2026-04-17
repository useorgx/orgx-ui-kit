/**
 * Minimal line-level diff for explain_md markdown. Produces a sequence
 * of hunks: 'unchanged' | 'added' | 'removed'.
 *
 * We use the classic LCS algorithm — good enough for plan rationale
 * (typically under 200 lines). Big-doc performance isn't relevant here.
 */

export type DiffLine = {
  kind: 'unchanged' | 'added' | 'removed';
  text: string;
};

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const m = a.length;
  const n = b.length;

  // Build LCS table.
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        lcs[i][j] = 1 + lcs[i + 1][j + 1];
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ kind: 'unchanged', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: 'removed', text: a[i] });
      i++;
    } else {
      out.push({ kind: 'added', text: b[j] });
      j++;
    }
  }
  while (i < m) {
    out.push({ kind: 'removed', text: a[i++] });
  }
  while (j < n) {
    out.push({ kind: 'added', text: b[j++] });
  }
  return out;
}

export function summarizeDiff(diff: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const d of diff) {
    if (d.kind === 'added') added++;
    else if (d.kind === 'removed') removed++;
  }
  return { added, removed };
}
