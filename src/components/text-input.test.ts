import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import {renderToString} from 'ink'
import {TextInput} from './text-input.js'
import {ThemeProvider} from '../theme.js'

test('TextInput renders full string value without word fragmentation', () => {
  const url = 'https://youtu.be/dQw4w9WgXcQ'
  const out = renderToString(
    React.createElement(
      ThemeProvider,
      {mode: 'dark'},
      React.createElement(TextInput, {
        value: url,
        onChange: () => {},
        width: 40,
      }),
    ),
  )

  // Inverted cursor ANSI sequence will invert only the character under cursor,
  // while the rest of the text remains as contiguous words.
  assert.match(out, /https:\/\/youtu\.be\/dQw4w9WgXcQ/)
})

test('TextInput renders placeholder when empty', () => {
  const out = renderToString(
    React.createElement(
      ThemeProvider,
      {mode: 'dark'},
      React.createElement(TextInput, {
        value: '',
        placeholder: 'Paste link here...',
        onChange: () => {},
        width: 40,
      }),
    ),
  )

  assert.match(out, /Paste link here\.\.\./)
})
