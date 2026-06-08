// ─── LCS-Based Diff Function ──────────────────────────────────
// Uses Longest Common Subsequence (LCS) for proper diff computation

type DiffLine = { type: 'same' | 'added' | 'removed'; line: string };

// Build LCS table for two string arrays
function buildLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  // Use 2D array for compatibility with backtrack
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

// Backtrack through LCS table to produce diff
function backtrackLCS(
  dp: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number,
  n: number
): DiffLine[] {
  if (i === 0 && j === 0) return [];

  if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
    return [
      ...backtrackLCS(dp, a, b, i - 1, j - 1, n),
      { type: 'same', line: a[i - 1] },
    ];
  }

  if (j > 0 && (i === 0 || dp[i * (n + 1) + j - 1] >= dp[(i - 1) * (n + 1) + j])) {
    return [
      ...backtrackLCS(dp, a, b, i, j - 1, n),
      { type: 'added', line: b[j - 1] },
    ];
  }

  if (i > 0) {
    return [
      ...backtrackLCS(dp, a, b, i - 1, j, n),
      { type: 'removed', line: a[i - 1] },
    ];
  }

  return [];
}

// For large files (>1000 lines), fall back to simple positional diff to avoid stack overflow
function simpleDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < oldLines.length && i < newLines.length) {
      if (oldLines[i] === newLines[i]) {
        result.push({ type: 'same', line: oldLines[i] });
      } else {
        result.push({ type: 'removed', line: oldLines[i] });
        result.push({ type: 'added', line: newLines[i] });
      }
    } else if (i < oldLines.length) {
      result.push({ type: 'removed', line: oldLines[i] });
    } else {
      result.push({ type: 'added', line: newLines[i] });
    }
  }
  return result;
}

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // For very large files, use simple diff to avoid performance issues
  if (oldLines.length > 1000 || newLines.length > 1000) {
    return simpleDiff(oldText, newText);
  }

  const n = newLines.length;
  const dp = buildLCS(oldLines, newLines);

  // Iterative backtracking to avoid stack overflow
  const result: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'same', line: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i * (n + 1) + j - 1] >= dp[(i - 1) * (n + 1) + j])) {
      result.unshift({ type: 'added', line: newLines[j - 1] });
      j--;
    } else if (i > 0) {
      result.unshift({ type: 'removed', line: oldLines[i - 1] });
      i--;
    } else {
      break;
    }
  }

  return result;
}
