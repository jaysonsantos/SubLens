import { describe, expect, it } from 'vitest'
import { charDiff, diffLines } from '../diff'

describe('diffLines', () => {
  it('marks identical arrays as equal', () => {
    const result = diffLines(['a', 'b'], ['a', 'b'])
    expect(result).toEqual([
      { type: 'equal', left: 'a', right: 'a', index: 1, start: '', end: '' },
      { type: 'equal', left: 'b', right: 'b', index: 2, start: '', end: '' },
    ])
  })

  it('marks differing lines as changed', () => {
    const result = diffLines(['hello'], ['hola'])
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('changed')
    expect(result[0].left).toBe('hello')
    expect(result[0].right).toBe('hola')
  })

  it('marks extra right lines as added', () => {
    const result = diffLines(['a'], ['a', 'b'])
    expect(result[1].type).toBe('added')
    expect(result[1].right).toBe('b')
  })

  it('marks extra left lines as removed', () => {
    const result = diffLines(['a', 'b'], ['a'])
    expect(result[1].type).toBe('removed')
    expect(result[1].left).toBe('b')
  })

  it('handles empty left array', () => {
    const result = diffLines([], ['x', 'y'])
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('added')
    expect(result[1].type).toBe('added')
  })

  it('handles empty right array', () => {
    const result = diffLines(['x', 'y'], [])
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('removed')
    expect(result[1].type).toBe('removed')
  })

  it('handles both empty arrays', () => {
    const result = diffLines([], [])
    expect(result).toHaveLength(0)
  })

  it('uses 1-based indexing', () => {
    const result = diffLines(['a', 'b', 'c'], ['a', 'b', 'c'])
    expect(result.map((r) => r.index)).toEqual([1, 2, 3])
  })

  it('handles mixed equal, changed, added, removed', () => {
    const result = diffLines(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'e'])
    expect(result[0].type).toBe('equal')
    expect(result[1].type).toBe('changed')
    expect(result[2].type).toBe('equal')
    expect(result[3].type).toBe('changed')
  })
})

describe('charDiff', () => {
  it('marks identical strings as all equal', () => {
    const { left, right } = charDiff('abc', 'abc')
    expect(left).toEqual([
      { text: 'a', type: 'equal' },
      { text: 'b', type: 'equal' },
      { text: 'c', type: 'equal' },
    ])
    expect(right).toEqual([
      { text: 'a', type: 'equal' },
      { text: 'b', type: 'equal' },
      { text: 'c', type: 'equal' },
    ])
  })

  it('marks single character change', () => {
    const { left, right } = charDiff('abc', 'axc')
    expect(left).toEqual([
      { text: 'a', type: 'equal' },
      { text: 'b', type: 'removed' },
      { text: 'c', type: 'equal' },
    ])
    expect(right).toEqual([
      { text: 'a', type: 'equal' },
      { text: 'x', type: 'added' },
      { text: 'c', type: 'equal' },
    ])
  })

  it('handles all characters removed', () => {
    const { left, right } = charDiff('abc', '')
    expect(left.every((s) => s.type === 'removed')).toBe(true)
    expect(right).toEqual([])
  })

  it('handles all characters added', () => {
    const { left, right } = charDiff('', 'abc')
    expect(left).toEqual([])
    expect(right.every((s) => s.type === 'added')).toBe(true)
  })

  it('handles empty vs empty', () => {
    const { left, right } = charDiff('', '')
    expect(left).toEqual([])
    expect(right).toEqual([])
  })

  it('reconstructs original strings from segments', () => {
    const { left, right } = charDiff('Hello world', 'Hola world')
    expect(left.map((s) => s.text).join('')).toBe('Hello world')
    expect(right.map((s) => s.text).join('')).toBe('Hola world')
  })

  it('handles prefix change', () => {
    const { left, right } = charDiff('cat', 'bat')
    expect(left[0].type).toBe('removed')
    expect(left[0].text).toBe('c')
    expect(right[0].type).toBe('added')
    expect(right[0].text).toBe('b')
    // shared suffix
    expect(left[1]).toEqual({ text: 'a', type: 'equal' })
    expect(left[2]).toEqual({ text: 't', type: 'equal' })
  })
})
