import assert from 'node:assert/strict'
import test from 'node:test'
import {formatBytes, formatDuration, formatEta, formatSpeed, shortenPath, truncate, wrapText} from './format.js'

test('formatBytes formats 0 bytes as "0 B"', () => {
  assert.equal(formatBytes(0), '0 B')
})

test('formatBytes formats positive bytes and units', () => {
  assert.equal(formatBytes(500), '500 B')
  assert.equal(formatBytes(1024), '1.0 KB')
  assert.equal(formatBytes(1536), '1.5 KB')
  assert.equal(formatBytes(10 * 1024 * 1024), '10 MB')
})

test('formatBytes returns empty string for negative or non-finite numbers', () => {
  assert.equal(formatBytes(-10), '')
  assert.equal(formatBytes(NaN), '')
  assert.equal(formatBytes(Infinity), '')
})

test('wrapText wraps normal sentences to line width', () => {
  const text = 'hello world this is a test'
  const lines = wrapText(text, 12)
  for (const line of lines) {
    assert.ok(line.length <= 12, `Line "${line}" exceeds width 12`)
  }
})

test('wrapText splits single words that exceed width to prevent layout overflow', () => {
  const longWord = 'supercalifragilisticexpialidocious'
  const lines = wrapText(longWord, 10)
  for (const line of lines) {
    assert.ok(line.length <= 10, `Line "${line}" exceeds width 10`)
  }
  assert.equal(lines.join(''), longWord)
})
