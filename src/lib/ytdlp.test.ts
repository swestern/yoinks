import assert from 'node:assert/strict'
import test from 'node:test'
import {parseFormatCount} from './ytdlp.js'

test('parseFormatCount extracts format count from 1 format download line', () => {
  const line = '[info] dQw4w9WgXcQ: Downloading 1 format(s): 251'
  assert.equal(parseFormatCount(line), 1)
})

test('parseFormatCount extracts format count from 2 format merged download line', () => {
  const line = '[info] dQw4w9WgXcQ: Downloading 2 format(s): 137, 251'
  assert.equal(parseFormatCount(line), 2)
})

test('parseFormatCount extracts format count from 3 format download line', () => {
  const line = '[info] abcdefgh: Downloading 3 format(s): 137, 251, 140'
  assert.equal(parseFormatCount(line), 3)
})

test('parseFormatCount returns undefined for non-matching lines', () => {
  assert.equal(parseFormatCount('[download] Destination: video.mp4'), undefined)
  assert.equal(parseFormatCount(''), undefined)
})
