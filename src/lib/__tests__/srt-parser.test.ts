import { describe, expect, it } from 'vitest'
import { formatTime, parseSRT } from '../srt-parser'

describe('parseSRT', () => {
  it('parses a valid single-block SRT', () => {
    const result = parseSRT('1\n00:00:01,000 --> 00:00:04,000\nHello world')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      index: 1,
      start: '00:00:01,000',
      end: '00:00:04,000',
      text: 'Hello world',
    })
  })

  it('parses multiple blocks', () => {
    const raw = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'Hello',
      '',
      '2',
      '00:00:05,000 --> 00:00:08,000',
      'Goodbye',
    ].join('\n')
    const result = parseSRT(raw)
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('Hello')
    expect(result[1].text).toBe('Goodbye')
  })

  it('joins multi-line text', () => {
    const raw = '1\n00:00:01,000 --> 00:00:04,000\nLine one\nLine two'
    const result = parseSRT(raw)
    expect(result[0].text).toBe('Line one\nLine two')
  })

  it('normalizes CRLF to LF', () => {
    const raw =
      '1\r\n00:00:01,000 --> 00:00:04,000\r\nHello\r\n\r\n2\r\n00:00:05,000 --> 00:00:08,000\r\nWorld'
    const result = parseSRT(raw)
    expect(result).toHaveLength(2)
  })

  it('handles extra blank lines between blocks', () => {
    const raw =
      '1\n00:00:01,000 --> 00:00:04,000\nHello\n\n\n\n2\n00:00:05,000 --> 00:00:08,000\nWorld'
    const result = parseSRT(raw)
    expect(result).toHaveLength(2)
  })

  it('returns defaults for malformed blocks', () => {
    const result = parseSRT('garbage')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ index: 0, start: '', end: '', text: '' })
  })

  it('parses timestamps with dot instead of comma', () => {
    const raw = '1\n00:00:01.500 --> 00:00:04.200\nHello'
    const result = parseSRT(raw)
    expect(result[0].start).toBe('00:00:01.500')
    expect(result[0].end).toBe('00:00:04.200')
  })

  it('trims leading/trailing whitespace', () => {
    const raw = '  \n  1\n00:00:01,000 --> 00:00:04,000\nHello  \n  '
    const result = parseSRT(raw)
    expect(result).toHaveLength(1)
  })

  it('preserves HTML tags in text', () => {
    const raw = '1\n00:00:01,000 --> 00:00:04,000\n<i>Hello</i>'
    const result = parseSRT(raw)
    expect(result[0].text).toBe('<i>Hello</i>')
  })

  it('handles empty input gracefully', () => {
    const result = parseSRT('')
    // trim + split produces one empty block
    expect(result).toHaveLength(1)
  })
})

describe('formatTime', () => {
  it('replaces comma with dot', () => {
    expect(formatTime('00:00:01,000')).toBe('00:00:01.000')
  })

  it('leaves dot-formatted times unchanged', () => {
    expect(formatTime('00:01:23.456')).toBe('00:01:23.456')
  })

  it('returns empty string unchanged', () => {
    expect(formatTime('')).toBe('')
  })
})
