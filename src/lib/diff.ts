export interface DiffResult {
  type: 'equal' | 'changed' | 'added' | 'removed'
  left: string
  right: string
  index: number
  start: string
  end: string
}

export function diffLines(left: string[], right: string[]): DiffResult[] {
  const result: DiffResult[] = []
  const max = Math.max(left.length, right.length)

  for (let i = 0; i < max; i++) {
    const l = left[i] ?? ''
    const r = right[i] ?? ''

    if (i >= left.length) {
      result.push({
        type: 'added',
        left: '',
        right: r,
        index: i + 1,
        start: '',
        end: '',
      })
    } else if (i >= right.length) {
      result.push({
        type: 'removed',
        left: l,
        right: '',
        index: i + 1,
        start: '',
        end: '',
      })
    } else if (l === r) {
      result.push({
        type: 'equal',
        left: l,
        right: r,
        index: i + 1,
        start: '',
        end: '',
      })
    } else {
      result.push({
        type: 'changed',
        left: l,
        right: r,
        index: i + 1,
        start: '',
        end: '',
      })
    }
  }

  return result
}

export function charDiff(
  a: string,
  b: string,
): { left: Segment[]; right: Segment[] } {
  const dp: number[][] = []
  const m = a.length
  const n = b.length

  for (let i = 0; i <= m; i++) {
    dp[i] = [i]
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }

  const leftSegs: Segment[] = []
  const rightSegs: Segment[] = []
  let i = m,
    j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      leftSegs.push({ text: a[i - 1], type: 'equal' })
      rightSegs.push({ text: b[j - 1], type: 'equal' })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      rightSegs.push({ text: b[j - 1], type: 'added' })
      j--
    } else {
      leftSegs.push({ text: a[i - 1], type: 'removed' })
      i--
    }
  }

  return { left: leftSegs.reverse(), right: rightSegs.reverse() }
}

export interface Segment {
  text: string
  type: 'equal' | 'added' | 'removed'
}
